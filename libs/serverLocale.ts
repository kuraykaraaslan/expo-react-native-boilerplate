import type { Locale } from "@/libs/i18n";

// ============================================================================
// Client language → the BCP-47 tag sent to the server.
// next-boilerplate reads `Accept-Language` (auth.i18n `resolveLocale` keeps the
// primary subtag) and validates stored locales against the IANA registry, so a
// bare code works — but the full tag is what a browser would send and what
// `common.locale` canonicalises to. An explicit table, never string slicing.
// ============================================================================

export const SERVER_LOCALE: Record<Locale, string> = {
  en: "en-US",
  tr: "tr-TR",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
};

/** Unknown or empty input falls back to English rather than sending a made-up tag. */
export function serverLocaleFor(locale: string | null | undefined): string {
  return SERVER_LOCALE[(locale ?? "").toLowerCase() as Locale] ?? SERVER_LOCALE.en;
}
