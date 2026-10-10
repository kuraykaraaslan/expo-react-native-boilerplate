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

// ── Timeline (audit-log rows of one domain) ──────────────────────────────────

export const DomainTimelineEntrySchema = z.object({
  auditLogId: z.string(),
  action: z.string(),
  /** low | medium | high | critical — a string so a new level doesn't break parsing. */
  severity: z.string().default("low"),
  actorType: z.string().nullish(),
  actorId: z.string().nullish(),
  createdAt: z.string().nullish(),
});
export type DomainTimelineEntry = z.infer<typeof DomainTimelineEntrySchema>;

/** GET /domains/{id}/timeline?page&pageSize → `{ success, logs, total }` (`page` is 1-based, newest first). */
export const DomainTimelineResponseSchema = z.object({
  logs: z.array(DomainTimelineEntrySchema).default([]),
  total: z.number().default(0),
});
export type DomainTimeline = z.infer<typeof DomainTimelineResponseSchema>;

// ── Health report ────────────────────────────────────────────────────────────

const CountBySchema = z.object({ status: z.string(), count: z.coerce.number().default(0) });

export const DomainReportSchema = z.object({
  generatedAt: z.string().nullish(),
  sslExpiryWarningDays: z.coerce.number().default(0),
  snapshot: z
    .object({
      totalDomains: z.coerce.number().default(0),
      verified: z.coerce.number().default(0),
      unverified: z.coerce.number().default(0),
      dnsFailed: z.coerce.number().default(0),
      sslActive: z.coerce.number().default(0),
      sslExpiring: z.coerce.number().default(0),
      sslFailed: z.coerce.number().default(0),
      sslNone: z.coerce.number().default(0),
      domainStatusBreakdown: z.array(CountBySchema).default([]),
      sslStatusBreakdown: z.array(CountBySchema).default([]),
    })
    .default({}),
  sslExpiry: z
    .array(
      z.object({
        tenantDomainId: z.string(),
        domain: z.string(),
        sslStatus: z.string().nullish(),
        sslIssuer: z.string().nullish(),
        sslExpiresAt: z.string().nullish(),
        daysUntilExpiry: z.number().nullish(),
        atRisk: z.boolean().default(false),
      }),
    )
    .default([]),
  dnsAge: z
    .array(
      z.object({
        tenantDomainId: z.string(),
        domain: z.string(),
        domainStatus: z.string().nullish(),
        verifiedAt: z.string().nullish(),
        daysSinceVerified: z.number().nullish(),
      }),
    )
    .default([]),
});
export type DomainReport = z.infer<typeof DomainReportSchema>;

/** GET /domains/report → `{ success, report }`. */
export const DomainReportResponseSchema = z.object({ report: DomainReportSchema });
