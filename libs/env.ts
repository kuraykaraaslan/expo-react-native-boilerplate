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
});

export type Env = z.infer<typeof envSchema>;
