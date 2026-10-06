import { z } from "zod";

// ============================================================================
// User profile — mirror of next-boilerplate user_profile (types + dto).
// Responses are parsed leniently: the server's profile has many more fields
// and the social-platform enum has 40+ values, so unknown values must not
// break `.parse()`.
// ============================================================================

// ── Social Link ───────────────────────────────────────────────────────────────

export const SocialLinkItemSchema = z.object({
  id: z.string(),
  /** GITHUB, LINKEDIN, TWITTER, … (server enum is long — kept as a string). */
  platform: z.string(),
  url: z.string().nullish(),
  order: z.number().int().nonnegative(),
});
export type SocialLinkItem = z.infer<typeof SocialLinkItemSchema>;

// ── User Profile ──────────────────────────────────────────────────────────────

export const UserProfileSchema = z.object({
  name: z.string().nullish(),
  displayName: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  pronouns: z.string().nullish(),
  biography: z.string().nullish(),
  profilePicture: z.string().nullish(),
  headerImage: z.string().nullish(),
  socialLinks: z.array(SocialLinkItemSchema).nullish().transform((v) => v ?? []),
  isVerified: z.boolean().nullish(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ── Request / Response DTOs ───────────────────────────────────────────────────

/**
 * PUT /auth/me/profile body (inside `{ userProfile }`). The server schema makes
 * every key REQUIRED but nullable — omitting one is a 400 — so send all five.
 */
export const UpdateProfileRequestSchema = z.object({
  name: z.string().nullable(),
  biography: z.string().nullable(),
  profilePicture: z.string().nullable(),
  headerImage: z.string().nullable(),
  socialLinks: z.array(SocialLinkItemSchema).nullable(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

/** GET → `{ userProfile }`; PUT → `{ message, userProfile }`. */
export const ProfileResponseSchema = z.object({
  message: z.string().optional(),
  userProfile: UserProfileSchema.nullish(),
});
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
