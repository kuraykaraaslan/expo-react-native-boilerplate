import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { TranslationTree } from "@/modules/localization/translation.dto";
import { useTranslationStore } from "@/stores/translationStore";

// ============================================================================
// i18n Singleton — initialized once, imported everywhere
//
// Texts come from two layers:
//   1. Bundled  — locales/*.json shipped in the binary. Used on the very first
//                 launch and offline; English is also the fallback for any key
//                 a language lacks.
//   2. Remote   — bundles downloaded from the server (libs/translations.ts) and
//                 cached in MMKV. Applied over the bundled texts of the same
//                 language, so the server can correct a text or add a language
//                 without a store release.
// ============================================================================

import en from "@/locales/en.json";
import tr from "@/locales/tr.json";
import de from "@/locales/de.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";

export const NAMESPACE = "common";
export const FALLBACK_LOCALE = "en";

const BUNDLED: Record<string, TranslationTree> = { en, tr, de, es, fr, it };

/** Languages shipped in the binary — usable even when the server was never reached. */
export const BUNDLED_LOCALES = Object.keys(BUNDLED);

/** Flag + endonym for language pickers (each language named in itself). */
export const BUNDLED_LOCALE_META: Record<string, { flag: string; name: string }> = {
  en: { flag: "🇬🇧", name: "English" },
  tr: { flag: "🇹🇷", name: "Türkçe" },
  de: { flag: "🇩🇪", name: "Deutsch" },
  es: { flag: "🇪🇸", name: "Español" },
  fr: { flag: "🇫🇷", name: "Français" },
  it: { flag: "🇮🇹", name: "Italiano" },
};

/** "BG", "bg-BG" → "bg-bg"; i18next is configured with lowerCaseLng to match. */
export function normalizeLocale(code: string): string {
  return code.trim().toLowerCase();
}

/**
 * Replaces a language's texts with bundled + `remote` (remote wins key by key).
 * Rebuilt from scratch so a key the server deleted does not linger.
 */
export function applyLanguageTexts(code: string, remote: TranslationTree | null): void {
  i18n.removeResourceBundle(code, NAMESPACE);
  const bundled = BUNDLED[code];
  if (bundled) i18n.addResourceBundle(code, NAMESPACE, bundled, true, true);
  if (remote) i18n.addResourceBundle(code, NAMESPACE, remote, true, true);
}

/** True when this device can show `code` right now, without the network. */
export function hasLanguageTexts(code: string): boolean {
  return code in BUNDLED || code in useTranslationStore.getState().bundles;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: Object.fromEntries(Object.entries(BUNDLED).map(([code, tree]) => [code, { [NAMESPACE]: tree }])),
    lng: FALLBACK_LOCALE,
    fallbackLng: FALLBACK_LOCALE,
    defaultNS: NAMESPACE,
    lowerCaseLng: true,
    interpolation: {
      escapeValue: false,
    },
    // Re-render on downloaded texts too, not only on a language change.
    react: { bindI18nStore: "added removed" },
  });

  // Cached remote texts are on screen from the first render (MMKV reads are synchronous).
  for (const [code, bundle] of Object.entries(useTranslationStore.getState().bundles)) {
    applyLanguageTexts(code, bundle.messages);
  }
}

export default i18n;
