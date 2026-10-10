import { normalizeApiError } from "@/libs/apiError";
import logger from "@/libs/logger";
import { TenantClientService } from "@/services/tenant/tenant.service.client";
import type { Invitation, MemberRole, TenantMembership } from "@/services/tenant/tenant.dto";
import { useAuthStore } from "@/stores/authStore";
import { getActiveTenantId, useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Answering a pending invitation by id (POST /invitations/{id}/accept|decline).
//
// The route is ACCOUNT scope: the URL names the INVITING tenant, the bearer is
// the token pair this device holds for the CURRENT tenant (the invited tenant
// has none yet). After the answer GET /auth/me/tenants is read again (Phase 5
// flow) so the notice and the organization list match the server.
// ============================================================================

export type InvitationAction = "accept" | "decline";

export type InvitationResult = {
  action: InvitationAction;
  /** The organization (inviting tenant) the invitation was for. */
  tenantId: string;
  /** Accept only: the role granted. */
  memberRole?: MemberRole;
  /** Accept only: the new membership, when the refreshed list carried it. */
  membership: TenantMembership | null;
  /** The organization or session changed while the request was in flight: nothing was written to the stores. */
  stale: boolean;
};

/** Identity of the session a request was made in; changes on an organization switch or a sign-out. */
function sessionKey(): string | null {
  return useAuthStore.getState().isAuthenticated ? getActiveTenantId() : null;
}

/**
 * Re-reads GET /auth/me/tenants into the store. A result for another organization
 * or a signed-out session is dropped. Returns whether the store was updated.
 */
export async function refreshTenantOverview(): Promise<TenantMembership[] | null> {
  const key = sessionKey();
  if (!key) return null;
  try {
    const overview = await TenantClientService.getMyTenants();
    if (sessionKey() !== key) return null;
    useTenantStore.getState().setTenantOverview(overview);
    return overview.tenants;
  } catch (err) {
    logger.warn("[invitations] overview refresh failed", normalizeApiError(err).statusCode ?? "-");
    return null;
  }
}

/** Accept or decline `invitation`. Throws the service error (callers map it with `invitationErrorKey`). */
export async function answerInvitation(invitation: Invitation, action: InvitationAction): Promise<InvitationResult> {
  const key = sessionKey();
  const authTenantId = getActiveTenantId();
  let memberRole: MemberRole | undefined;
  if (action === "accept") {
    memberRole = (await TenantClientService.acceptInvitationById(invitation.tenantId, invitation.invitationId, authTenantId)).memberRole;
  } else {
    await TenantClientService.declineInvitationById(invitation.tenantId, invitation.invitationId, authTenantId);
  }
  if (sessionKey() !== key) return { action, tenantId: invitation.tenantId, memberRole, membership: null, stale: true };

  const tenants = await refreshTenantOverview();
  if (sessionKey() !== key) return { action, tenantId: invitation.tenantId, memberRole, membership: null, stale: true };
  if (!tenants) {
    // The answer succeeded but the list could not be re-read: at least stop offering this invitation.
    useTenantStore.setState((s) => ({ pendingInvitations: s.pendingInvitations.filter((i) => i.invitationId !== invitation.invitationId) }));
  }
  return {
    action,
    tenantId: invitation.tenantId,
    memberRole,
    membership: tenants?.find((m) => m.tenantId === invitation.tenantId) ?? null,
    stale: false,
  };
}

/**
 * Locale key for the refusals this route is known to produce, else null (use the
 * generic handler). 403: the account's email is not verified (the only 403 the
 * ACCOUNT-scope route raises for a signed-in user). 404: no such invitation for
 * this account (also what someone else's invitation answers). 409: already
 * answered. 410: revoked or expired.
 */
export function invitationErrorKey(err: unknown): string | null {
  switch (normalizeApiError(err).statusCode) {
    case 403:
      return "MY_INVITATIONS.EMAIL_NOT_VERIFIED";
    case 404:
      return "MY_INVITATIONS.NOT_FOUND";
    case 409:
      return "MY_INVITATIONS.ALREADY_ANSWERED";
    case 410:
      return "MY_INVITATIONS.EXPIRED";
    default:
      return null;
  }
}

/** The invitation can no longer be answered: drop it from the list by re-reading the server's. */
export function invitationIsGone(err: unknown): boolean {
  const status = normalizeApiError(err).statusCode;
  return status === 404 || status === 409 || status === 410;
}
