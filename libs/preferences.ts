import { toast } from "sonner-native";
import i18n from "@/libs/i18n";
import logger from "@/libs/logger";
import {
  clearPendingLanguage,
  deferLanguage,
  getPendingLanguage,
  isLanguageOffered,
  localeName,
  selectLanguage,
} from "@/libs/translations";
import type { Theme } from "@/modules/user/preferences.dto";
import { ProfileClientService } from "@/modules/user/profile.service.client";
import { useAppStore } from "@/stores/appStore";

// ============================================================================
// Preference sync — `language` / `theme` live on the server (user_preferences)
// and in the app store. The server wins on sign-in; local changes are pushed
// best-effort (a failed push never undoes the change on this device).
// ============================================================================

const SCHEME_FROM_THEME = { LIGHT: "light", DARK: "dark", SYSTEM: "system" } as const;
const THEME_FROM_SCHEME: Record<"light" | "dark" | "system", Theme> = { light: "LIGHT", dark: "DARK", system: "SYSTEM" };

/**
 * Server → device. A language the app and the server do not offer is ignored; one
 * that could not be downloaded yet is deferred (retried on every sync) and the user
 * is told why the app is not in it yet.
 */
export async function pullPreferences(): Promise<void> {
  try {
    const prefs = await ProfileClientService.getPreferences();
    const app = useAppStore.getState();
    const scheme = SCHEME_FROM_THEME[prefs.theme];
    if (scheme && scheme !== app.colorScheme) app.setColorScheme(scheme);
    const language = prefs.language.toLowerCase().split("-")[0];
    if (language && language !== app.locale && isLanguageOffered(language) && !(await selectLanguage(language))) {
      if (getPendingLanguage() !== language) {
        toast.info(i18n.t("PREFERENCES.LANGUAGE_PENDING", { language: localeName(language) }));
      }
      deferLanguage(language);
    }
  } catch (err: unknown) {
    logger.warn("Preference pull failed", err instanceof Error ? err.message : "unknown");
  }
}

/** Device → server, after the user changed the language or theme on this device. */
export async function pushPreferences(patch: { language?: string; colorScheme?: "light" | "dark" | "system" }): Promise<void> {
  try {
    await ProfileClientService.updatePreferences({
      language: patch.language,
      theme: patch.colorScheme ? THEME_FROM_SCHEME[patch.colorScheme] : undefined,
    });
  } catch (err: unknown) {
    logger.warn("Preference push failed", err instanceof Error ? err.message : "unknown");
  }
}

/**
 * The user picked a language on this device: switch once its texts are on the
 * device, then record it on the profile. False when it cannot be shown yet.
 */
export async function changeLanguage(code: string): Promise<boolean> {
  clearPendingLanguage();
  if (!(await selectLanguage(code))) return false;
  void pushPreferences({ language: code });
  return true;
}
