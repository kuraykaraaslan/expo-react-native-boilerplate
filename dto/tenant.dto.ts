import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const MemberRoleEnum = z.enum(["USER", "ADMIN", "OWNER"]);
export type MemberRole = z.infer<typeof MemberRoleEnum>;

export const MemberStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]);
export type MemberStatus = z.infer<typeof MemberStatusEnum>;

export const TenantStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "PENDING_DELETION"]);
export type TenantStatus = z.infer<typeof TenantStatusEnum>;

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
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Tenant = z.infer<typeof TenantSchema>;

// ── Tenant Member ─────────────────────────────────────────────────────────────

export const TenantMemberSchema = z.object({
  tenantMemberId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  memberRole: MemberRoleEnum.default("USER"),
  memberStatus: MemberStatusEnum.default("ACTIVE"),
  tenant: TenantSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type TenantMember = z.infer<typeof TenantMemberSchema>;

// ── Invitation ────────────────────────────────────────────────────────────────

export const InvitationStatusEnum = z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "REVOKED"]);

export const InvitationSchema = z.object({
  invitationId: z.string(),
  tenantId: z.string(),
  memberRole: z.string(),
  status: InvitationStatusEnum,
  expiresAt: z.string().optional(),
  createdAt: z.string().optional(),
  tenant: TenantSchema.optional(),
});
export type Invitation = z.infer<typeof InvitationSchema>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

export const MyTenantsResponseSchema = z.object({
  tenants: z.array(TenantMemberSchema),
  invitations: z.array(InvitationSchema).optional().default([]),
});
export type MyTenantsResponse = z.infer<typeof MyTenantsResponseSchema>;
