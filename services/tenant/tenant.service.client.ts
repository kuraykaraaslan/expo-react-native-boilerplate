import axiosInstance from "@/libs/axios";
import { AckResponseSchema } from "@/services/auth/auth.dto";
import { PublicBrandingResponseSchema, type PublicBrandingResponse } from "@/services/tenant/branding.dto";
import {
  CreateTenantRequest,
  CreateTenantRequestSchema,
  CreateTenantResponse,
  CreateTenantResponseSchema,
  Invitation,
  InvitationActionResponseSchema,
  InvitationsListResponse,
  InvitationsListResponseSchema,
  InvitationStatus,
  MemberRole,
  MemberStatus,
  MembersListResponse,
  MembersListResponseSchema,
  MyTenantsResponse,
  MyTenantsResponseSchema,
  SendInvitationRequest,
  SendInvitationRequestSchema,
  TenantMember,
  TenantMemberSchema,
  TenantProfile,
  TransitionMemberRequest,
  TransitionMemberRequestSchema,
  TransitionMemberResponseSchema,
  TenantProfileSchema,
  TenantSettingsResponseSchema,
  UpdateMemberRequest,
  UpdateMemberRequestSchema,
  UpdateMemberResponse,
  UpdateMemberResponseSchema,
  UpdateTenantProfileRequest,
  UpdateTenantProfileRequestSchema,
} from "@/services/tenant/tenant.dto";

// Paths are relative: libs/axios adds the tenant address prefix. Methods that
// act on a specific tenant take its id and pass it as `{ tenantId }` so the
// request is addressed (and authenticated) as that tenant, not the active one.

export class TenantClientService {
  // ── Account-level ──────────────────────────────────────────────────────────

  /** Every organization the user belongs to (the list is user-global, whichever tenant is addressed). */
  static async getMyTenants(): Promise<MyTenantsResponse> {
    const res = await axiosInstance.get("/auth/me/tenants");
    return MyTenantsResponseSchema.parse(res.data);
  }

  /** Creates an organization and makes the caller its OWNER. The name needs at least 2 characters. */
  static async createTenant(payload: CreateTenantRequest): Promise<CreateTenantResponse> {
    const body = CreateTenantRequestSchema.parse(payload);
    const res = await axiosInstance.post("/tenants/create", body);
    return CreateTenantResponseSchema.parse(res.data);
  }

  // ── Own organization profile ───────────────────────────────────────────────

  static async getTenantProfile(tenantId?: string): Promise<TenantProfile> {
    const res = await axiosInstance.get("/tenant/profile", { tenantId });
    return TenantProfileSchema.parse(res.data);
  }

  static async updateTenantProfile(payload: UpdateTenantProfileRequest, tenantId?: string): Promise<TenantProfile> {
    const body = UpdateTenantProfileRequestSchema.parse(payload);
    const res = await axiosInstance.put("/tenant/profile", body, { tenantId });
    return TenantProfileSchema.parse(res.data);
  }

  // ── Members (page is 0-based) ──────────────────────────────────────────────

  static async getMembers(
    tenantId: string,
    params?: { page?: number; pageSize?: number; search?: string; memberRole?: MemberRole; memberStatus?: MemberStatus },
  ): Promise<MembersListResponse> {
    const res = await axiosInstance.get("/members", { tenantId, params });
    return MembersListResponseSchema.parse(res.data);
  }

  static async getMember(tenantId: string, memberId: string): Promise<TenantMember> {
    const res = await axiosInstance.get(`/members/${encodeURIComponent(memberId)}`, { tenantId });
    return TenantMemberSchema.parse(res.data?.member);
  }

  /**
   * With dual control on, a sensitive role change is queued: the server answers
   * 202 `{ pendingApproval: true }` and returns no `member`.
   */
  static async updateMember(tenantId: string, memberId: string, payload: UpdateMemberRequest): Promise<UpdateMemberResponse> {
    const body = UpdateMemberRequestSchema.parse(payload);
    const res = await axiosInstance.put(`/members/${encodeURIComponent(memberId)}`, body, { tenantId });
    return UpdateMemberResponseSchema.parse(res.data);
  }

  /** Suspends (revokes the member's sessions) or reactivates a member (ADMIN+; only an OWNER may act on an OWNER). */
  static async transitionMember(tenantId: string, memberId: string, payload: TransitionMemberRequest): Promise<TenantMember> {
    const body = TransitionMemberRequestSchema.parse(payload);
    const res = await axiosInstance.post(`/members/${encodeURIComponent(memberId)}/transition`, body, { tenantId });
    return TransitionMemberResponseSchema.parse(res.data).member;
  }

  static async removeMember(tenantId: string, memberId: string): Promise<void> {
    const res = await axiosInstance.delete(`/members/${encodeURIComponent(memberId)}`, { tenantId });
    AckResponseSchema.parse(res.data);
  }

  // ── Invitations (page is 1-based) ──────────────────────────────────────────

  static async getInvitations(
    tenantId: string,
    params?: { page?: number; pageSize?: number; status?: InvitationStatus },
  ): Promise<InvitationsListResponse> {
    const res = await axiosInstance.get("/invitations", { tenantId, params });
    return InvitationsListResponseSchema.parse(res.data);
  }

  static async sendInvitation(tenantId: string, payload: SendInvitationRequest): Promise<void> {
    const body = SendInvitationRequestSchema.parse(payload);
    const res = await axiosInstance.post("/invitations", body, { tenantId });
    AckResponseSchema.parse(res.data);
  }

  static async revokeInvitation(tenantId: string, invitationId: string): Promise<void> {
    const res = await axiosInstance.delete(`/invitations/${encodeURIComponent(invitationId)}`, { tenantId });
    AckResponseSchema.parse(res.data);
  }

  /** Rotates the token, extends the expiry and re-sends the e-mail for a PENDING invitation (ADMIN+). */
  static async resendInvitation(tenantId: string, invitationId: string): Promise<Invitation> {
    const res = await axiosInstance.post(`/invitations/${encodeURIComponent(invitationId)}/resend`, undefined, { tenantId });
    return InvitationActionResponseSchema.parse(res.data).invitation;
  }

  /** E-mails a reminder for a still-PENDING invitation; keeps the original expiry (ADMIN+). */
  static async remindInvitation(tenantId: string, invitationId: string): Promise<Invitation> {
    const res = await axiosInstance.post(`/invitations/${encodeURIComponent(invitationId)}/remind`, undefined, { tenantId });
    return InvitationActionResponseSchema.parse(res.data).invitation;
  }

  static async acceptInvitation(tenantId: string, token: string): Promise<void> {
    const res = await axiosInstance.post("/invitations/accept", { token }, { tenantId });
    AckResponseSchema.parse(res.data);
  }

  static async declineInvitation(tenantId: string, token: string): Promise<void> {
    const res = await axiosInstance.post("/invitations/decline", { token }, { tenantId });
    AckResponseSchema.parse(res.data);
  }

  // ── Public branding (GUEST route: works before sign-in) ────────────────────

  static async getPublicBranding(tenantId?: string): Promise<PublicBrandingResponse> {
    const res = await axiosInstance.get("/settings/public", { tenantId, skipAuth: true });
    return PublicBrandingResponseSchema.parse(res.data);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  static async getTenantSettings(tenantId: string): Promise<Record<string, string>> {
    const res = await axiosInstance.get("/settings", { tenantId });
    return TenantSettingsResponseSchema.parse(res.data).settings;
  }

  static async updateTenantSettings(tenantId: string, settings: Record<string, string>): Promise<Record<string, string>> {
    return (await this.saveTenantSettings(tenantId, settings)).settings;
  }

  /** Like updateTenantSettings, but also reports the keys that were queued for approval instead of written. */
  static async saveTenantSettings(
    tenantId: string,
    settings: Record<string, string>,
  ): Promise<{ settings: Record<string, string>; pending: { key: string; approvalItemId: string }[] }> {
    const res = await axiosInstance.post("/settings", { settings }, { tenantId });
    const parsed = TenantSettingsResponseSchema.parse(res.data);
    return { settings: parsed.settings, pending: parsed.pending };
  }
}
