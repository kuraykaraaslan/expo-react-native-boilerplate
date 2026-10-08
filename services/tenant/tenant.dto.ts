import { z } from "zod";
import { UserProfileSchema } from "@/services/user/profile.dto";

// ============================================================================
// Tenant DTOs — mirror of next-boilerplate tenant / tenant_member /
// tenant_invitation / tenant_domain types and the routes that return them.
// Dates arrive as ISO strings (JSON). Keys the server may leave out are nullish.
// ============================================================================

// ── Enums ─────────────────────────────────────────────────────────────────────

export const MemberRoleEnum = z.enum(["OWNER", "ADMIN", "USER"]);
export type MemberRole = z.infer<typeof MemberRoleEnum>;

export const MemberStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]);
export type MemberStatus = z.infer<typeof MemberStatusEnum>;

export const TenantStatusEnum = z.enum(["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED", "DELETED", "ARCHIVED"]);
export type TenantStatus = z.infer<typeof TenantStatusEnum>;

export const InvitationStatusEnum = z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "REVOKED"]);
export type InvitationStatus = z.infer<typeof InvitationStatusEnum>;

// ── Tenant ────────────────────────────────────────────────────────────────────

export const TenantDomainSchema = z.object({
  tenantDomainId: z.string(),
  domain: z.string(),
  isPrimary: z.boolean().nullish(),
  /** PENDING / VERIFIED / ACTIVE / … — string: the app never branches on it. */
  domainStatus: z.string(),
});
export type TenantDomain = z.infer<typeof TenantDomainSchema>;

/** SafeTenant; also the shorter summary embedded in memberships and invitations. */
export const TenantSchema = z.object({
  tenantId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  region: z.string().nullish(),
  slug: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish(),
  tenantStatus: TenantStatusEnum.default("ACTIVE"),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  domains: z.array(TenantDomainSchema).nullish().transform((v) => v ?? []),
});
export type Tenant = z.infer<typeof TenantSchema>;

// ── Members ───────────────────────────────────────────────────────────────────

export const MemberUserSchema = z.object({
  userId: z.string(),
  email: z.string().nullish(),
  userProfile: UserProfileSchema.nullish(),
});
export type MemberUser = z.infer<typeof MemberUserSchema>;

/** One row of GET /members and the `member` of GET|PUT /members/{id}. */
export const TenantMemberSchema = z.object({
  tenantMemberId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  memberRole: MemberRoleEnum.default("USER"),
  roleKeys: z.array(z.string()).nullish().transform((v) => v ?? []),
  memberStatus: MemberStatusEnum.default("ACTIVE"),
  externalId: z.string().nullish(),
  suspensionReason: z.string().nullish(),
  suspendedUntil: z.string().nullish(),
  lastActiveAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  tenant: TenantSchema.nullish(),
  user: MemberUserSchema.nullish(),
});
export type TenantMember = z.infer<typeof TenantMemberSchema>;

/**
 * One membership of the signed-in user, from GET /auth/me/tenants. The server
 * sends `{ tenantMemberId, memberRole, memberStatus, tenant }` — no top-level
 * `tenantId` / `userId` — so `tenantId` is lifted from `tenant.tenantId`.
 */
export const TenantMembershipSchema = z
  .object({
    tenantMemberId: z.string(),
    memberRole: MemberRoleEnum,
    memberStatus: MemberStatusEnum,
    tenant: TenantSchema,
  })
  .transform((m) => ({ ...m, tenantId: m.tenant.tenantId }));
export type TenantMembership = z.output<typeof TenantMembershipSchema>;

// ── Invitations ───────────────────────────────────────────────────────────────

/** SafeTenantInvitation (lists) and the slimmer shape inside GET /auth/me/tenants (no `email`). */
export const InvitationSchema = z.object({
  invitationId: z.string(),
  tenantId: z.string(),
  email: z.string().nullish(),
  invitedByUserId: z.string().nullish(),
  memberRole: MemberRoleEnum.default("USER"),
  status: InvitationStatusEnum,
  expiresAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  tenant: TenantSchema.nullish(),
});
export type Invitation = z.infer<typeof InvitationSchema>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

/** A client tenant reachable as a delegate (currently always empty server-side). */
export const DelegatedTenantSchema = z.object({
  via: z.literal("delegate"),
  delegateTenantId: z.string(),
  tenant: TenantSchema,
});
export type DelegatedTenant = z.infer<typeof DelegatedTenantSchema>;

/** GET /auth/me/tenants */
export const MyTenantsResponseSchema = z.object({
  success: z.boolean().optional(),
  tenants: z.array(TenantMembershipSchema),
  delegatedTenants: z.array(DelegatedTenantSchema).nullish().transform((v) => v ?? []),
  invitations: z.array(InvitationSchema).nullish().transform((v) => v ?? []),
});
export type MyTenantsResponse = z.infer<typeof MyTenantsResponseSchema>;

/** GET /members — `page` is 0-based. */
export const MembersListResponseSchema = z.object({
  members: z.array(TenantMemberSchema),
  total: z.number().default(0),
  page: z.number().default(0),
  pageSize: z.number().default(10),
});
export type MembersListResponse = z.infer<typeof MembersListResponseSchema>;

/** GET /invitations — `page` is 1-based. */
export const InvitationsListResponseSchema = z.object({
  invitations: z.array(InvitationSchema),
  total: z.number().default(0),
  page: z.number().default(1),
  pageSize: z.number().default(10),
});
export type InvitationsListResponse = z.infer<typeof InvitationsListResponseSchema>;

/** POST /invitations/{id}/resend and /remind: `{ message, invitation }` (the rotated token is only e-mailed). */
export const InvitationActionResponseSchema = z.object({
  message: z.string(),
  invitation: InvitationSchema,
});
export type InvitationActionResponse = z.infer<typeof InvitationActionResponseSchema>;

/** POST /tenants/create (201) */
export const CreateTenantResponseSchema = z.object({
  success: z.boolean(),
  tenant: z.object({
    tenantId: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    tenantStatus: TenantStatusEnum,
  }),
  message: z.string().optional(),
});
export type CreateTenantResponse = z.infer<typeof CreateTenantResponseSchema>;

/** PUT /members/{id}: 200 with `member`, or 202 `pendingApproval` (dual control) with none. */
export const UpdateMemberResponseSchema = z.object({
  message: z.string(),
  member: TenantMemberSchema.optional(),
  pendingApproval: z.boolean().optional(),
});
export type UpdateMemberResponse = z.infer<typeof UpdateMemberResponseSchema>;

/** GET /tenant/profile → `{ name, description }`; PUT adds `message`. */
export const TenantProfileSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  message: z.string().optional(),
});
export type TenantProfile = z.infer<typeof TenantProfileSchema>;

/** GET|POST /settings → `{ success, settings }` (string map). */
export const TenantSettingsResponseSchema = z.object({
  success: z.boolean().optional(),
  settings: z.record(z.string()),
});
export type TenantSettingsResponse = z.infer<typeof TenantSettingsResponseSchema>;

// ── Request DTOs ──────────────────────────────────────────────────────────────

/** The route rejects names shorter than 2 characters after trimming. */
export const CreateTenantRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().nullish(),
  region: z.string().default("TR"),
});
/** Input type: `region` has a default, so callers may omit it. */
export type CreateTenantRequest = z.input<typeof CreateTenantRequestSchema>;

export const UpdateTenantProfileRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullish(),
});
export type UpdateTenantProfileRequest = z.infer<typeof UpdateTenantProfileRequestSchema>;

export const SendInvitationRequestSchema = z.object({
  email: z.string().email(),
  memberRole: MemberRoleEnum.default("USER"),
});
export type SendInvitationRequest = z.input<typeof SendInvitationRequestSchema>;

export const UpdateMemberRequestSchema = z.object({
  memberRole: MemberRoleEnum.nullish(),
  memberStatus: MemberStatusEnum.nullish(),
});
export type UpdateMemberRequest = z.infer<typeof UpdateMemberRequestSchema>;
