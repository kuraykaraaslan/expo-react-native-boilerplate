import { z } from "zod";

// ============================================================================
// SSO DTOs — mirror of next-boilerplate auth_sso (enums + routes).
// ============================================================================

export const SSOProviderEnum = z.enum([
  "google",
  "apple",
  "facebook",
  "github",
  "linkedin",
  "microsoft",
  "twitter",
  "slack",
  "tiktok",
  "wechat",
  "autodesk",
  "yandex",
  "vk",
  "qq",
  "weibo",
  "alipay",
]);
export type SSOProvider = z.infer<typeof SSOProviderEnum>;

/**
 * GET /auth/sso — providers the tenant allows. A provider this app version
 * does not know is dropped instead of failing the whole list.
 */
export const SSOProvidersResponseSchema = z.object({
  providers: z
    .array(z.string())
    .transform((list) => list.flatMap((p) => {
      const parsed = SSOProviderEnum.safeParse(p);
      return parsed.success ? [parsed.data] : [];
    })),
});
export type SSOProvidersResponse = z.infer<typeof SSOProvidersResponseSchema>;

/** GET /auth/sso/{provider} — where to send the user, and the OAuth `state`. */
export const SSOAuthUrlResponseSchema = z.object({
  url: z.string().url(),
  state: z.string(),
});
export type SSOAuthUrlResponse = z.infer<typeof SSOAuthUrlResponseSchema>;
