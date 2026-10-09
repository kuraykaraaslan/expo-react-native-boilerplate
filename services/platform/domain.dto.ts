import { z } from "zod";

// ============================================================================
// Tenant domains — mirror of next-boilerplate tenant_domain.
// Answers are wrapped `{ success, … }`. SafeTenantDomain omits the verification
// token; the DNS record to create comes from the separate `verification` block.
// ============================================================================

export const DomainSchema = z.object({
  tenantDomainId: z.string(),
  domain: z.string(),
  isPrimary: z.boolean().default(false),
  /** ACTIVE | INACTIVE | PENDING | VERIFIED | DNS_FAILED — a string so a new status doesn't break parsing. */
  domainStatus: z.string(),
  verifiedAt: z.string().nullish(),
  /** DISABLED | PENDING | PROVISIONING | ACTIVE | EXPIRING | EXPIRED | FAILED */
  sslStatus: z.string().default("DISABLED"),
  sslIssuedAt: z.string().nullish(),
  sslExpiresAt: z.string().nullish(),
  sslIssuer: z.string().nullish(),
  sslLastCheckedAt: z.string().nullish(),
  createdAt: z.string().nullish(),
});
export type Domain = z.infer<typeof DomainSchema>;

/** The DNS record the owner must create at their registrar. */
export const DomainVerificationSchema = z.object({
  domain: z.string(),
  method: z.string(), // TXT | CNAME
  recordName: z.string(),
  recordValue: z.string(),
  domainStatus: z.string().nullish(),
});
export type DomainVerification = z.infer<typeof DomainVerificationSchema>;

/** GET /domains → `{ success, domains, total }`. */
export const DomainListResponseSchema = z.object({ domains: z.array(DomainSchema), total: z.number().default(0) });

/** GET /domains/{id} → `{ success, domain, verification | null }`. */
export const DomainDetailResponseSchema = z.object({ domain: DomainSchema, verification: DomainVerificationSchema.nullish() });
export type DomainDetail = { domain: Domain; verification: DomainVerification | null };

/** POST /domains → `{ success, domain }`. */
export const DomainCreateResponseSchema = z.object({ domain: DomainSchema });

/** POST /domains/{id}/verify → `{ success, isVerified, message }`. */
export const DomainVerifyResponseSchema = z.object({ isVerified: z.boolean(), message: z.string().optional() });
export type DomainVerifyResult = z.infer<typeof DomainVerifyResponseSchema>;
