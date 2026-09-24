import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const MemberRoleEnum = z.enum(["USER", "ADMIN", "OWNER"]);
export type MemberRole = z.infer<typeof MemberRoleEnum>;

export const MemberStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]);
export type MemberStatus = z.infer<typeof MemberStatusEnum>;

export const TenantStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "PENDING_DELETION"]);
export type TenantStatus = z.infer<typeof TenantStatusEnum>;

export const InvitationStatusEnum = z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "REVOKED"]);
export type InvitationStatus = z.infer<typeof InvitationStatusEnum>;

// ── Tenant Domain ─────────────────────────────────────────────────────────────

export const TenantDomainSchema = z.object({
  tenantDomainId: z.string(),
  domain: z.string(),
  domainStatus: z.enum(["ACTIVE", "VERIFIED", "PENDING"]).default("PENDING"),
});
export type TenantDomain = z.infer<typeof TenantDomainSchema>;

// ── Tenant ────────────────────────────────────────────────────────────────────

export const TenantSchema = z.object({
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  tenantStatus: TenantStatusEnum.default("ACTIVE"),
  logo: z.string().url().optional().nullable(),
  favicon: z.string().url().optional().nullable(),
  theme: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  domains: z.array(TenantDomainSchema).optional().default([]),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});
export type Tenant = z.infer<typeof TenantSchema>;

// ── Tenant Member ─────────────────────────────────────────────────────────────

export const MemberUserSchema = z.object({
  userId: z.string(),
  email: z.string().optional().nullable(),
  userProfile: z.object({
    name: z.string().optional().nullable(),
    profilePicture: z.string().optional().nullable(),
  }).optional().nullable(),
});
export type MemberUser = z.infer<typeof MemberUserSchema>;

export const TenantMemberSchema = z.object({
  tenantMemberId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  memberRole: MemberRoleEnum.default("USER"),
  memberStatus: MemberStatusEnum.default("ACTIVE"),
  tenant: TenantSchema.optional().nullable(),
  user: MemberUserSchema.optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});
export type TenantMember = z.infer<typeof TenantMemberSchema>;

// ── Invitation ────────────────────────────────────────────────────────────────

export const InvitationSchema = z.object({
  invitationId: z.string(),
  tenantId: z.string(),
  email: z.string().optional().nullable(),
  memberRole: MemberRoleEnum.default("USER"),
  status: InvitationStatusEnum,
  expiresAt: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  tenant: TenantSchema.optional().nullable(),
});
export type Invitation = z.infer<typeof InvitationSchema>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

export const MyTenantsResponseSchema = z.object({
  tenants: z.array(TenantMemberSchema),
  invitations: z.array(InvitationSchema).optional().default([]),
});
export type MyTenantsResponse = z.infer<typeof MyTenantsResponseSchema>;

export const MembersListResponseSchema = z.object({
  members: z.array(TenantMemberSchema),
  total: z.number().default(0),
  page: z.number().default(0),
  pageSize: z.number().default(10),
});
export type MembersListResponse = z.infer<typeof MembersListResponseSchema>;

export const InvitationsListResponseSchema = z.object({
  invitations: z.array(InvitationSchema),
  total: z.number().default(0),
  page: z.number().default(1),
  pageSize: z.number().default(10),
});
export type InvitationsListResponse = z.infer<typeof InvitationsListResponseSchema>;

export const CreateTenantResponseSchema = z.object({
  success: z.boolean(),
  tenant: z.object({
    tenantId: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    tenantStatus: TenantStatusEnum.default("ACTIVE"),
  }),
  message: z.string().optional(),
});
export type CreateTenantResponse = z.infer<typeof CreateTenantResponseSchema>;

// ── Request DTOs ──────────────────────────────────────────────────────────────

export const CreateTenantRequestSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional().nullable(),
  region: z.string().default("TR"),
});
// z.input: `region` has a default, so callers may omit it.
export type CreateTenantRequest = z.input<typeof CreateTenantRequestSchema>;

export const SendInvitationRequestSchema = z.object({
  email: z.string().email(),
  memberRole: MemberRoleEnum.default("USER"),
});
export type SendInvitationRequest = z.infer<typeof SendInvitationRequestSchema>;

export const UpdateMemberRequestSchema = z.object({
  memberRole: MemberRoleEnum.optional().nullable(),
  memberStatus: MemberStatusEnum.optional().nullable(),
});
export type UpdateMemberRequest = z.infer<typeof UpdateMemberRequestSchema>;
