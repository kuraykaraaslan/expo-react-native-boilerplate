import { z } from "zod";

// ============================================================================
// Environment Schema
// ============================================================================

const envSchema = z.object({
  /**
   * API origin only — no path. Requests are sent to
   * `${origin}/api/tenant/{tenantId}/<path>`, which next-boilerplate's proxy
   * rewrites to its tenant API. Default: Android emulator host.
   */
  EXPO_PUBLIC_API_URL: z
    .string()
    .url()
    .default("http://10.0.2.2:3000")
    .transform((url) => url.replace(/\/+$/, ""))
    .refine((url) => !/\/api$/.test(url), "EXPO_PUBLIC_API_URL must be the origin only (drop the trailing /api)"),
  /**
   * Tenant a fresh install signs in to (K1: the server has no unauthenticated
   * tenant discovery). Required — see .env.example.
   */
  EXPO_PUBLIC_DEFAULT_TENANT_ID: z
    .string({ required_error: "EXPO_PUBLIC_DEFAULT_TENANT_ID is required (see .env.example)" })
    .min(1, "EXPO_PUBLIC_DEFAULT_TENANT_ID is required (see .env.example)")
    .uuid("EXPO_PUBLIC_DEFAULT_TENANT_ID must be the tenant's UUID (see .env.example)"),
  EXPO_PUBLIC_APP_NAME: z.string().default("App"),
  EXPO_PUBLIC_APP_VERSION: z.string().default("1.0.0"),
  EXPO_PUBLIC_FRONTEND_URL: z.string().default("http://localhost:3000"),
  /**
   * EAS project id (UUID) that Expo push tokens are issued for. Optional: push stays off without it
   * (or without `extra.eas.projectId` from app.config.ts). An empty value counts as unset.
   */
  EXPO_PUBLIC_EAS_PROJECT_ID: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().uuid("EXPO_PUBLIC_EAS_PROJECT_ID must be the EAS project UUID (see .env.example)").optional(),
  ),
  /**
   * Passkey relying-party domain (hostname only, no scheme or path): the host that serves
   * `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` and equals the server's
   * `WEBAUTHN_RP_ID` (or, unset there, its application hostname). Optional: passkeys stay off while it is
   * empty. app.config.ts reads the same variable for the iOS `webcredentials:` associated domain.
   */
  EXPO_PUBLIC_PASSKEY_RP_ID: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9.-]+$/, "EXPO_PUBLIC_PASSKEY_RP_ID must be a hostname only (no scheme, port or path)")
      .optional(),
  ),
});

// ============================================================================
// Validated Environment
// ============================================================================

export const env = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_DEFAULT_TENANT_ID: process.env.EXPO_PUBLIC_DEFAULT_TENANT_ID,
  EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
  EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
  EXPO_PUBLIC_FRONTEND_URL: process.env.EXPO_PUBLIC_FRONTEND_URL,
  EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  EXPO_PUBLIC_PASSKEY_RP_ID: process.env.EXPO_PUBLIC_PASSKEY_RP_ID,
});

export type Env = z.infer<typeof envSchema>;
