import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { dictionaries as account } from "@/modules/account/dictionaries";
import { dictionaries as appShell } from "@/modules/app_shell/dictionaries";
import { dictionaries as auditLog } from "@/modules/audit_log/dictionaries";
import { dictionaries as auth } from "@/modules/auth/dictionaries";
import { dictionaries as common } from "@/modules/common/dictionaries";
import { dictionaries as dashboard } from "@/modules/dashboard/dictionaries";
import { dictionaries as notificationInapp } from "@/modules/notification_inapp/dictionaries";
import { dictionaries as privacy } from "@/modules/privacy/dictionaries";
import { dictionaries as tenant } from "@/modules/tenant/dictionaries";
import { dictionaries as tenantInvitation } from "@/modules/tenant_invitation/dictionaries";
import { dictionaries as tenantMember } from "@/modules/tenant_member/dictionaries";
import { dictionaries as tenantSetting } from "@/modules/tenant_setting/dictionaries";
import { dictionaries as user } from "@/modules/user/dictionaries";
import { dictionaries as userSecurity } from "@/modules/user_security/dictionaries";
import { dictionaries as userSession } from "@/modules/user_session/dictionaries";
import type { Messages } from "@/modules/localization/translation.dto";
import { useTranslationStore } from "@/stores/translationStore";

// ============================================================================
// i18n Singleton — initialized once, imported everywhere
//
// Texts are split per module (modules/<module>/dictionaries/<lang>.json) with the
// same flat keys as next-boilerplate — "<module>.<area>.<slug>", e.g.
// "auth.login.title" — so web and mobile can share a key and its translation.
// All modules merge into ONE i18next namespace; the module prefix keeps them apart.
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
export const BUNDLED_DICTIONARIES: Record<string, Record<string, Messages>> = {
  account,
  app_shell: appShell,
  audit_log: auditLog,
  auth,
  common,
  dashboard,
  notification_inapp: notificationInapp,
  privacy,
  tenant,
  tenant_invitation: tenantInvitation,
  tenant_member: tenantMember,
  tenant_setting: tenantSetting,
  user,
  user_security: userSecurity,
  user_session: userSession,
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

function bundledTexts(code: string): Messages[] {
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
    // Keys are flat and contain dots ("auth.login.title"): never split them into a path.
    keySeparator: false,
    nsSeparator: false,
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
