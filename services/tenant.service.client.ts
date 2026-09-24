import axiosInstance from "@/libs/axios";
import {
  MyTenantsResponse,
  MyTenantsResponseSchema,
  MembersListResponse,
  MembersListResponseSchema,
  InvitationsListResponse,
  InvitationsListResponseSchema,
  TenantMember,
  TenantMemberSchema,
  CreateTenantRequest,
  CreateTenantRequestSchema,
  CreateTenantResponse,
  CreateTenantResponseSchema,
  SendInvitationRequest,
  UpdateMemberRequest,
} from "@/dto/tenant.dto";

export class TenantClientService {
  // ── System tenant endpoints ────────────────────────────────────────────────

  static async getMyTenants(): Promise<MyTenantsResponse> {
    const res = await axiosInstance.get("/api/system/auth/me/tenants");
    return MyTenantsResponseSchema.parse(res.data);
  }

  static async createTenant(payload: CreateTenantRequest): Promise<CreateTenantResponse> {
    const res = await axiosInstance.post("/api/system/tenants/create", CreateTenantRequestSchema.parse(payload));
    return CreateTenantResponseSchema.parse(res.data);
  }

  // ── Tenant members ─────────────────────────────────────────────────────────

  static async getMembers(
    tenantId: string,
    params?: { page?: number; pageSize?: number; search?: string }
  ): Promise<MembersListResponse> {
    const res = await axiosInstance.get(`/api/tenant/${tenantId}/members`, { params });
    return MembersListResponseSchema.parse(res.data);
  }

  static async getMember(tenantId: string, memberId: string): Promise<TenantMember> {
    const res = await axiosInstance.get(`/api/tenant/${tenantId}/members/${memberId}`);
    return TenantMemberSchema.parse(res.data?.member);
  }

  static async updateMember(
    tenantId: string,
    memberId: string,
    payload: UpdateMemberRequest
  ): Promise<TenantMember> {
    const res = await axiosInstance.put(`/api/tenant/${tenantId}/members/${memberId}`, payload);
    return TenantMemberSchema.parse(res.data?.member);
  }

  static async removeMember(tenantId: string, memberId: string): Promise<void> {
    await axiosInstance.delete(`/api/tenant/${tenantId}/members/${memberId}`);
  }

  // ── Tenant invitations ─────────────────────────────────────────────────────

  static async getInvitations(
    tenantId: string,
    params?: { page?: number; pageSize?: number; status?: string }
  ): Promise<InvitationsListResponse> {
    const res = await axiosInstance.get(`/api/tenant/${tenantId}/invitations`, { params });
    return InvitationsListResponseSchema.parse(res.data);
  }

  static async sendInvitation(tenantId: string, payload: SendInvitationRequest): Promise<void> {
    await axiosInstance.post(`/api/tenant/${tenantId}/invitations`, payload);
  }

  static async revokeInvitation(tenantId: string, invitationId: string): Promise<void> {
    await axiosInstance.delete(`/api/tenant/${tenantId}/invitations/${invitationId}`);
  }

  static async acceptInvitation(tenantId: string, token: string): Promise<void> {
    await axiosInstance.post(`/api/tenant/${tenantId}/invitations/accept`, { token });
  }

  static async declineInvitation(tenantId: string, token: string): Promise<void> {
    await axiosInstance.post(`/api/tenant/${tenantId}/invitations/decline`, { token });
  }

  // ── Tenant settings ────────────────────────────────────────────────────────

  static async getTenantSettings(tenantId: string): Promise<Record<string, string>> {
    const res = await axiosInstance.get(`/api/tenant/${tenantId}/settings`);
    return res.data?.settings ?? {};
  }

  static async updateTenantSettings(
    tenantId: string,
    settings: Record<string, string>
  ): Promise<Record<string, string>> {
    const res = await axiosInstance.post(`/api/tenant/${tenantId}/settings`, { settings });
    return res.data?.settings ?? {};
  }
}
