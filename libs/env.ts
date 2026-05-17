import { z } from "zod";

// ============================================================================
// Environment Schema
// ============================================================================

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().default("http://10.0.2.2:3000/api/"),
  EXPO_PUBLIC_APP_NAME: z.string().default("App"),
  EXPO_PUBLIC_APP_VERSION: z.string().default("1.0.0"),
  EXPO_PUBLIC_FRONTEND_URL: z.string().default("http://localhost:3000"),
});

// ============================================================================
// Validated Environment
// ============================================================================

export const env = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
  EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
  EXPO_PUBLIC_FRONTEND_URL: process.env.EXPO_PUBLIC_FRONTEND_URL,
});

export type Env = z.infer<typeof envSchema>;
