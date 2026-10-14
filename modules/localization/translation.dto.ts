import { z } from "zod";

// ============================================================================
// Remote translations — languages and UI texts kept in the server database, so
// a language can be added or a text corrected without a store release.
//
// Contract (next-boilerplate `localization` module). Both are GUEST routes under
// the tenant prefix, so the login screen is translated before sign-in:
//   GET  /localization/languages
//     → { languages: [{ code, name, flag?, version }] }
//   POST /localization/languages/{code}   body { platform, module }
//     → { code, version, platform, module, messages: { KEY: "text" | { … } } }
// `version` changes whenever any text of that language changes (e.g. the max
// updatedAt of its rows); the app downloads a language only when it differs.
// `messages` has the same nested shape as locales/en.json.
// ============================================================================

export type TranslationTree = { [key: string]: string | TranslationTree };

export const TranslationTreeSchema: z.ZodType<TranslationTree> = z.lazy(() =>
  z.record(z.union([z.string(), TranslationTreeSchema])),
);

/** ISO 639-1/-3 code, optionally with a region ("bg", "pt-BR"); normalised to lowercase language + region as sent. */
export const LanguageCodeSchema = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/i);

export const RemoteLanguageSchema = z.object({
  code: LanguageCodeSchema,
  /** Endonym — the language named in itself ("Български"). */
  name: z.string().min(1),
  flag: z.string().nullish(),
  version: z.string().min(1),
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
  messages: TranslationTreeSchema,
});
export type TranslationBundle = z.infer<typeof TranslationBundleSchema>;
