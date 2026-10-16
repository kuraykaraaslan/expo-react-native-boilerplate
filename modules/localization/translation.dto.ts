import { z } from "zod";

// ============================================================================
// Remote translations — languages and UI texts kept in the server database, so
// a language can be added or a text corrected without a store release.
//
// Contract (next-boilerplate `localization` module). Both are GUEST routes under
// the tenant prefix, so the login screen is translated before sign-in:
//   GET  /localization/languages?platform=<android|ios|web>
//     → { languages: [{ code, name, flag?, versions: { <module>: "<version>" } }] }
//     Only languages with texts for that platform; `flag` is an ISO 3166 country
//     code ("BG"), shown as an emoji by libs/translations.ts.
//   POST /localization/languages/{code}   body { platform, module }
//     → { code, version, platform, module, messages: { "<module>.<area>.<slug>": "text" } }
// Texts are split per server module, like modules/<module>/dictionaries/ here.
// A module's `version` changes whenever any of its texts changes in that
// language (e.g. the max updatedAt of its rows); the app downloads only the
// modules whose version differs. `messages` is flat, like
// modules/<module>/dictionaries/en.json: { "auth.login.title": "Welcome back" }.
// ============================================================================

/** Flat key → text map, as in next-boilerplate: { "auth.login.title": "Welcome back" }. */
export type Messages = Record<string, string>;

export const MessagesSchema = z.record(z.string());

/** ISO 639-1/-3 code, optionally with a region ("bg", "pt-BR"); normalised to lowercase language + region as sent. */
export const LanguageCodeSchema = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/i);

export const RemoteLanguageSchema = z.object({
  code: LanguageCodeSchema,
  /** Endonym — the language named in itself ("Български"). */
  name: z.string().min(1),
  /** ISO 3166 alpha-2 country code of the flag ("BG"). */
  flag: z.string().nullish(),
  /** module → version of that module's texts in this language. */
  versions: z.record(z.string().min(1)),
});
export type RemoteLanguage = z.infer<typeof RemoteLanguageSchema>;

export const LanguagesResponseSchema = z.object({
  languages: z.array(RemoteLanguageSchema),
});
export type LanguagesResponse = z.infer<typeof LanguagesResponseSchema>;

/** Platform the texts are for; matches react-native's Platform.OS (web: the Expo web build). */
export const TranslationPlatformSchema = z.enum(["android", "ios", "web"]);
export type TranslationPlatform = z.infer<typeof TranslationPlatformSchema>;

/** POST /localization/languages/{code} body. */
export const TranslationBundleRequestSchema = z.object({
  platform: TranslationPlatformSchema,
  /** Server module whose dictionary is wanted. */
  module: z.string().min(1),
});
export type TranslationBundleRequest = z.infer<typeof TranslationBundleRequestSchema>;

export const TranslationBundleSchema = z.object({
  code: LanguageCodeSchema,
  version: z.string().min(1),
  platform: TranslationPlatformSchema,
  module: z.string().min(1),
  messages: MessagesSchema,
});
export type TranslationBundle = z.infer<typeof TranslationBundleSchema>;
