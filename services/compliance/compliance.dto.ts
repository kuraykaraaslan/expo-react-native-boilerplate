import { z } from "zod";

// ============================================================================
// Consent (terms_consent) and audit log (audit_log) — mirror of next-boilerplate.
// Consent routes are GUEST routes that identify the subject by a `userId` in the
// request, not by the session; the client always sends the signed-in user's own id.
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

/** GET /consent?userId= → `{ state }`: the latest decision per purpose (a purpose never answered is absent). */
export const ConsentStateResponseSchema = z.object({
  state: z.record(z.boolean()).default({}),
});

/** POST /consent with `decisions[]` (one per purpose) → 201 `{ records }`. */
export const RecordConsentRequestSchema = z.object({
  decisions: z.array(z.object({ purpose: ConsentPurposeEnum, granted: z.boolean() })).min(1).max(20),
  policyVersion: z.string().max(64).optional(),
  userId: z.string().uuid(),
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
