import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import auth from "@/modules/auth/dictionary";
import common from "@/modules/common/dictionary";
import compliance from "@/modules/compliance/dictionary";
import localization from "@/modules/localization/dictionary";
import type { TranslationTree } from "@/modules/localization/translation.dto";
import tenant from "@/modules/tenant/dictionary";
import user from "@/modules/user/dictionary";
import { useTranslationStore } from "@/stores/translationStore";

// ============================================================================
// i18n Singleton — initialized once, imported everywhere
//
// Texts are split per module (modules/<module>/dictionary/<lang>.json), like the
// server's dictionaries, and merged into ONE i18next namespace — so t("AUTH.X")
// works from anywhere and modules must not share a top-level section name.
// Two layers per module:
//   1. Bundled  — the dictionary JSON shipped in the binary. Used on the very
//                 first launch and offline; English is also the fallback for
//                 any key a language lacks.
//   2. Remote   — the module's dictionary downloaded from the server
//                 (libs/translations.ts) and cached in MMKV. Applied over the
//                 bundled texts of the same language, so the server can correct
//                 a text or add a language without a store release.
// ============================================================================

export const NAMESPACE = "common";
export const FALLBACK_LOCALE = "en";

/** module → language → bundled texts. */
export const BUNDLED_DICTIONARIES: Record<string, Record<string, TranslationTree>> = {
  common,
  auth,
  user,
  tenant,
  compliance,
  localization,
};

/** Languages shipped in the binary — usable even when the server was never reached. */
export const BUNDLED_LOCALES = Object.keys(common);

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

function bundledTexts(code: string): TranslationTree[] {
  return Object.values(BUNDLED_DICTIONARIES).flatMap((byLanguage) => (byLanguage[code] ? [byLanguage[code]] : []));
}

/**
 * Rebuilds a language's texts: every module's bundled dictionary, then every
 * cached remote one over it (remote wins key by key). Rebuilt from scratch so a
 * key the server deleted does not linger.
 */
export function applyLanguageTexts(code: string): void {
  i18n.removeResourceBundle(code, NAMESPACE);
  const remote = Object.values(useTranslationStore.getState().bundles[code] ?? {}).map((b) => b.messages);
  for (const tree of [...bundledTexts(code), ...remote]) {
    i18n.addResourceBundle(code, NAMESPACE, tree, true, true);
  }
}

/** True when this language ships in the binary (complete offline, whatever the server says). */
export function isBundledLocale(code: string): boolean {
  return BUNDLED_LOCALES.includes(code);
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {},
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

  // Bundled + cached remote texts are on screen from the first render (MMKV reads are synchronous).
  const cached = Object.keys(useTranslationStore.getState().bundles);
  for (const code of new Set([...BUNDLED_LOCALES, ...cached])) applyLanguageTexts(code);
}

export default i18n;
