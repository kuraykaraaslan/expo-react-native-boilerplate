import { z } from "zod";

// ============================================================================
// Consent (terms_consent) and audit log (audit_log) — mirror of next-boilerplate.
// Consent and agreement-acceptance routes are GUEST routes, but the subject follows
// the session: signed in, it is the session user and the client sends NO `userId`
// (a different one is 403). Only an anonymous caller names an `anonymousId`; this app
// has no guest screens, so it never sends one.
// ============================================================================

export const ConsentPurposeEnum = z.enum(["necessary", "functional", "analytics", "marketing"]);
export type ConsentPurpose = z.infer<typeof ConsentPurposeEnum>;

export const BannerPurposeSchema = z.object({
  key: ConsentPurposeEnum,
  label: z.string(),
  description: z.string().default(""),
  /** Required purposes (e.g. `necessary`) are always on and cannot be switched off. */
  required: z.boolean().default(false),
});
export type BannerPurpose = z.infer<typeof BannerPurposeSchema>;

/** GET /consent/config → `{ config }` (public). */
export const ConsentConfigResponseSchema = z.object({
  config: z.object({
    enabled: z.boolean(),
    policyVersion: z.string().default(""),
    bannerTitle: z.string().default(""),
    bannerMessage: z.string().default(""),
    purposes: z.array(BannerPurposeSchema).default([]),
  }),
});
export type ConsentConfig = z.infer<typeof ConsentConfigResponseSchema>["config"];

/** GET /consent → `{ state }` for the session user: the latest decision per purpose (a purpose never answered is absent). */
export const ConsentStateResponseSchema = z.object({
  state: z.record(z.boolean()).default({}),
});

/** POST /consent with `decisions[]` (one per purpose) → 201 `{ records }`. */
export const RecordConsentRequestSchema = z.object({
  decisions: z.array(z.object({ purpose: ConsentPurposeEnum, granted: z.boolean() })).min(1).max(20),
  policyVersion: z.string().max(64).optional(),
});
export type RecordConsentRequest = z.infer<typeof RecordConsentRequestSchema>;

// ── Audit log ────────────────────────────────────────────────────────────────

export const AuditSeverityEnum = z.enum(["low", "medium", "high", "critical"]);
export type AuditSeverity = z.infer<typeof AuditSeverityEnum>;

export const AuditLogSchema = z.object({
  auditLogId: z.string(),
  actorId: z.string().nullish(),
  actorType: z.enum(["USER", "SYSTEM", "API_KEY"]).default("USER"),
  action: z.string(),
  severity: AuditSeverityEnum.default("low"),
  resourceType: z.string().nullish(),
  resourceId: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish(),
  ipAddress: z.string().nullish(),
  createdAt: z.string(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

/** GET /audit-logs?page&pageSize&severity&action&fromDate&toDate — `page` is 1-based. */
export const AuditLogsResponseSchema = z.object({
  logs: z.array(AuditLogSchema).default([]),
  total: z.number().default(0),
});
export type AuditLogsResponse = z.infer<typeof AuditLogsResponseSchema>;

// ── Agreements (terms_consent) ───────────────────────────────────────────────

/**
 * One entry of `compliance.pendingAgreements` (GET /auth/session and the device
 * login body): a required agreement whose CURRENT version the user has not accepted.
 * `type` stays a free string so a new agreement type never fails a sign-in.
 */
export const PendingAgreementSchema = z.object({
  agreementId: z.string(),
  type: z.string(),
  key: z.string().default(""),
  title: z.string().default(""),
  versionId: z.string(),
  version: z.number(),
  contentHash: z.string().default(""),
});
export type PendingAgreement = z.infer<typeof PendingAgreementSchema>;

/**
 * The `compliance` section of the session answers. Parsed leniently: a section
 * that is absent (module off), null or malformed reads as "nothing pending", and one
 * bad entry is dropped instead of failing the whole sign-in.
 */
export const ComplianceSectionSchema = z
  .object({
    pendingAgreements: z
      .array(z.unknown())
      .default([])
      .transform((items) =>
        items.flatMap((item) => {
          const parsed = PendingAgreementSchema.safeParse(item);
          return parsed.success ? [parsed.data] : [];
        }),
      ),
  })
  .passthrough();
export type ComplianceSection = z.infer<typeof ComplianceSectionSchema>;

/** A schema slot for `compliance` that can never fail the answer it sits in. */
export const OptionalComplianceSchema = ComplianceSectionSchema.nullish().catch(undefined);

export const AgreementSchema = z.object({
  agreementId: z.string(),
  type: z.string(),
  key: z.string().default(""),
  title: z.string(),
  description: z.string().nullish(),
  requiresAcceptance: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export type Agreement = z.infer<typeof AgreementSchema>;

export const AgreementVersionSchema = z.object({
  versionId: z.string(),
  agreementId: z.string(),
  version: z.number(),
  /** The legal text. Plain text for display: never interpreted as HTML or markup. */
  content: z.string(),
  contentHash: z.string().default(""),
  language: z.string().default("en"),
  effectiveFrom: z.string().nullish(),
  publishedAt: z.string().nullish(),
});
export type AgreementVersion = z.infer<typeof AgreementVersionSchema>;

/** GET /agreements/current?type= → `{ agreement, version }`. */
export const CurrentAgreementSchema = z.object({ agreement: AgreementSchema, version: AgreementVersionSchema });
export type CurrentAgreement = z.infer<typeof CurrentAgreementSchema>;

/** GET /agreements/current (no type) → `{ data: [{ agreement, version }] }`. */
export const CurrentAgreementsResponseSchema = z.object({ data: z.array(CurrentAgreementSchema).default([]) });

/** POST /agreements/accept body: identify the agreement by id or type; never a userId. */
export const AcceptAgreementRequestSchema = z
  .object({
    agreementId: z.string().uuid().optional(),
    type: z.string().min(1).optional(),
    accepted: z.boolean().default(true),
  })
  .refine((d) => Boolean(d.agreementId) || Boolean(d.type), { message: "agreementId or type is required" });
export type AcceptAgreementRequest = z.input<typeof AcceptAgreementRequestSchema>;

/** POST /agreements/accept (201) → `{ acceptance }`; the server stamps the version that is CURRENT at that moment. */
export const AcceptAgreementResponseSchema = z.object({
  acceptance: z
    .object({
      acceptanceId: z.string().optional(),
      versionId: z.string().nullish(),
      accepted: z.boolean().default(true),
    })
    .passthrough(),
});
export type AcceptAgreementResponse = z.infer<typeof AcceptAgreementResponseSchema>;
