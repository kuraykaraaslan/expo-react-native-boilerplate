import { getToken } from "@/libs/secureStorage";
import { AuthClientService } from "@/services/auth/auth.service.client";
import type { MemberRole, TenantMembership } from "@/services/tenant/tenant.dto";
import { TenantClientService } from "@/services/tenant/tenant.service.client";
import { useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Tenant switching (K2): a device token is bound to one tenant, so switching
// means "use the token pair already stored for that tenant". No password is
// asked while a live pair exists; otherwise the user signs in to that tenant.
// ============================================================================

export type SwitchOutcome = "switched" | "login-required";

/** Makes `membership` the active organization, taking the role from the server, not from the cached list. */
function activate(membership: TenantMembership, memberRole: MemberRole): void {
  const tenants = useTenantStore.getState();
  tenants.setActiveTenantId(membership.tenantId);
  tenants.selectMembership({ ...membership, memberRole });
  tenants.setNeedsTenantSelection(false);
}

/**
 * Switches to an organization this device may already hold a session for.
 * The session is verified against that tenant explicitly, so a dead pair clears
 * itself and reports `login-required` without ending the session of the tenant
 * the user is currently in.
 */
export async function switchToTenant(membership: TenantMembership): Promise<SwitchOutcome> {
  const { tenantId } = membership;
  if (!(await getToken("accessToken", tenantId))) return "login-required";
  try {
    const session = await AuthClientService.getSession(tenantId);
    activate(membership, session.tenantMember.memberRole);
    return "switched";
  } catch (err) {
    // The interceptor cleared a dead pair: ask for the password. Anything else (offline, 5xx) is the caller's to report.
    if (!(await getToken("accessToken", tenantId))) return "login-required";
    throw err;
  }
}

/**
 * Finishes a sign-in to another organization (tokens were stored by
 * `startDeviceSession`): refresh the membership list and select the new tenant
 * with the role the login reply carried.
 */
export async function activateSignedInTenant(tenantId: string, memberRole: MemberRole): Promise<void> {
  const tenants = useTenantStore.getState();
  let membership = tenants.memberships.find((m) => m.tenantId === tenantId);
  if (!membership) {
    try {
      const overview = await TenantClientService.getMyTenants();
      tenants.setTenantOverview(overview);
      membership = overview.tenants.find((m) => m.tenantId === tenantId);
    } catch {
      // The list is a convenience; the login reply already proves membership.
    }
  }
  if (membership) {
    activate(membership, memberRole);
    return;
  }
  tenants.setActiveTenantId(tenantId);
  tenants.setNeedsTenantSelection(false);
  tenants.selectMembership(null);
}
