import { z } from "zod";

// ============================================================================
// API keys — mirror of next-boilerplate api_key (SafeApiKey: keyHash is never sent).
// Dates arrive as ISO strings. `rawKey` appears ONLY in the create / rotate
// answers and is never stored: hold it in component state, clear it on close.
// ============================================================================

export const ApiKeySchema = z.object({
  apiKeyId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  /** Coarse verbs (`read`, `write`, `admin`, `scim:*`) or `resource:action`. */
  scopes: z.array(z.string()).default([]),
  keyEnv: z.string().default("live"),
  ipAllowlist: z.array(z.string()).default([]),
  isActive: z.boolean(),
  lastUsedAt: z.string().nullish(),
  lastUsedIp: z.string().nullish(),
  usageCount: z.coerce.number().default(0),
  successorKeyId: z.string().nullish(),
  expiresAt: z.string().nullish(),
  createdAt: z.string().nullish(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

/** GET /api-keys → `{ keys, total }`. */
export const ApiKeyListResponseSchema = z.object({ keys: z.array(ApiKeySchema), total: z.number().default(0) });

/** POST /api-keys (201) and POST /api-keys/{id}/rotate (201). */
export const ApiKeyIssuedResponseSchema = z.object({ key: ApiKeySchema, rawKey: z.string() });
export type ApiKeyIssued = z.infer<typeof ApiKeyIssuedResponseSchema>;

export const ScopeDefinitionSchema = z.object({
  scope: z.string(),
  label: z.string().nullish(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  isActive: z.boolean().nullish(),
});
export type ScopeDefinition = z.infer<typeof ScopeDefinitionSchema>;

/** GET /api-keys/scope-definitions → `{ data, total }`. */
export const ScopeDefinitionListResponseSchema = z.object({ data: z.array(ScopeDefinitionSchema), total: z.number().default(0) });

/** POST /api-keys body. `expiresAt` is an ISO datetime. */
export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scopes: z.array(z.string()).min(1),
  environment: z.enum(["live", "test"]).optional(),
  expiresAt: z.string().datetime().optional(),
});
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;

/** POST /api-keys/revoke-all → how many keys were switched off. */
export const RevokeAllResponseSchema = z.object({ message: z.string().optional(), revokedCount: z.number().default(0) });

// ── Reports (read-only, ADMIN+; default window is the trailing 90 days) ──────

/** GET /api-keys/activity-report → the report itself, not wrapped. */
export const ApiKeyActivityReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  summary: z
    .object({
      totalKeys: z.coerce.number().default(0),
      activeKeys: z.coerce.number().default(0),
      inactiveKeys: z.coerce.number().default(0),
      expiredKeys: z.coerce.number().default(0),
      neverUsed: z.coerce.number().default(0),
      totalUsage: z.coerce.number().default(0),
    })
    .default({}),
  rows: z
    .array(
      z.object({
        apiKeyId: z.string(),
        name: z.string(),
        keyEnv: z.string().nullish(),
        scopes: z.array(z.string()).default([]),
        usageCount: z.coerce.number().default(0),
        lastUsedAt: z.string().nullish(),
        lastUsedIp: z.string().nullish(),
        isActive: z.boolean().default(true),
        expiresAt: z.string().nullish(),
        createdAt: z.string().nullish(),
      }),
    )
    .default([]),
});
export type ApiKeyActivityReport = z.infer<typeof ApiKeyActivityReportSchema>;

/** GET /api-keys/rotation-audit → the report itself, not wrapped. */
export const ApiKeyRotationAuditSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  summary: z
    .object({
      rotations: z.coerce.number().default(0),
      graceActive: z.coerce.number().default(0),
      revokedImmediately: z.coerce.number().default(0),
    })
    .default({}),
  rows: z
    .array(
      z.object({
        apiKeyId: z.string(),
        name: z.string(),
        keyEnv: z.string().nullish(),
        successorKeyId: z.string().nullish(),
        successorName: z.string().nullish(),
        rotatedAt: z.string().nullish(),
        graceExpiresAt: z.string().nullish(),
        isActive: z.boolean().default(false),
      }),
    )
    .default([]),
});
export type ApiKeyRotationAudit = z.infer<typeof ApiKeyRotationAuditSchema>;
