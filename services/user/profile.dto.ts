import { z } from "zod";

// ── Social Link ───────────────────────────────────────────────────────────────

export const SocialLinkPlatformEnum = z.enum([
  "TWITTER", "LINKEDIN", "GITHUB", "INSTAGRAM", "FACEBOOK",
  "YOUTUBE", "TIKTOK", "WEBSITE", "OTHER",
]);
export type SocialLinkPlatform = z.infer<typeof SocialLinkPlatformEnum>;

export const SocialLinkItemSchema = z.object({
  id: z.string().uuid(),
  platform: SocialLinkPlatformEnum,
  url: z.string().url().optional().nullable(),
  order: z.number().int().nonnegative(),
});
export type SocialLinkItem = z.infer<typeof SocialLinkItemSchema>;

// ── User Profile ──────────────────────────────────────────────────────────────

export const UserProfileSchema = z.object({
  name: z.string().optional().nullable(),
  biography: z.string().optional().nullable(),
  profilePicture: z.string().optional().nullable(),
  headerImage: z.string().optional().nullable(),
  socialLinks: z.array(SocialLinkItemSchema).default([]),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ── Request/Response DTOs ─────────────────────────────────────────────────────

export const UpdateProfileRequestSchema = z.object({
  name: z.string().optional().nullable(),
  biography: z.string().optional().nullable(),
  profilePicture: z.string().optional().nullable(),
  headerImage: z.string().optional().nullable(),
  socialLinks: z.array(SocialLinkItemSchema).optional().nullable(),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const ProfileResponseSchema = z.object({
  userProfile: UserProfileSchema.optional().nullable(),
});
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
