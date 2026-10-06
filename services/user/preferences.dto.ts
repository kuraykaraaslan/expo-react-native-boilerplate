import { z } from "zod";

// ============================================================================
// User preferences — mirror of next-boilerplate user_preferences.
// `language` / `theme` live here, NOT on SafeUser.
// ============================================================================

export const ThemeEnum = z.enum(["LIGHT", "DARK", "SYSTEM"]);
export type Theme = z.infer<typeof ThemeEnum>;

export const DateFormatEnum = z.enum(["DD_MM_YYYY", "MM_DD_YYYY", "YYYY_MM_DD"]);
export const TimeFormatEnum = z.enum(["H24", "H12"]);
export const FirstDayOfWeekEnum = z.enum(["MON", "SUN"]);

export const UserPreferencesSchema = z.object({
  theme: ThemeEnum,
  /** ISO 639-1 code; the server's list is longer than the app's locales. */
  language: z.string(),
  currency: z.string().nullish(),
  numberFormat: z.string().nullish(),
  measurementSystem: z.string().nullish(),
  timezone: z.string(),
  dateFormat: DateFormatEnum,
  timeFormat: TimeFormatEnum,
  firstDayOfWeek: FirstDayOfWeekEnum,
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  newsletter: z.boolean(),
  productUpdates: z.boolean().nullish(),
  promotionalOffers: z.boolean().nullish(),
  newsletterConsentAt: z.string().nullish(),
  marketingConsentAt: z.string().nullish(),
  schemaVersion: z.number().nullish(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/** Every field optional; absent or null means "leave it as it is" (server `keep()`). */
export const UpdatePreferencesRequestSchema = z.object({
  theme: ThemeEnum.nullish(),
  language: z.string().nullish(),
  emailNotifications: z.boolean().nullish(),
  smsNotifications: z.boolean().nullish(),
  pushNotifications: z.boolean().nullish(),
  newsletter: z.boolean().nullish(),
  timezone: z.string().nullish(),
  dateFormat: DateFormatEnum.nullish(),
  timeFormat: TimeFormatEnum.nullish(),
  firstDayOfWeek: FirstDayOfWeekEnum.nullish(),
});
export type UpdatePreferencesRequest = z.infer<typeof UpdatePreferencesRequestSchema>;

/** GET → `{ userPreferences }`; PUT → `{ message, userPreferences }`. */
export const PreferencesResponseSchema = z.object({
  message: z.string().optional(),
  userPreferences: UserPreferencesSchema,
});
export type PreferencesResponse = z.infer<typeof PreferencesResponseSchema>;
