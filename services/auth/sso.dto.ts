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

/**
 * One linked identity from GET /auth/me/social-accounts: the stored row (tokens
 * are never sent) plus the server's display descriptor. Lenient - the row has
 * more fields than the list needs, and providers are open-ended.
 */
export const ConnectedAccountSchema = z
  .object({
    userSocialAccountId: z.string(),
    provider: z.string(),
    displayName: z.string(),
    kind: z.string().nullish(),
    group: z.string().nullish(),
    country: z.string().nullish(),
    tokenExpired: z.boolean().nullish(),
    createdAt: z.string().nullish(),
  })
  .passthrough();
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;

export const SocialAccountsResponseSchema = z.object({
  accounts: z.array(ConnectedAccountSchema).nullish().transform((v) => v ?? []),
});
