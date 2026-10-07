import i18n, { SUPPORTED_LOCALES } from "@/libs/i18n";
import logger from "@/libs/logger";
import type { Theme } from "@/services/user/preferences.dto";
import { ProfileClientService } from "@/services/user/profile.service.client";
import { useAppStore } from "@/stores/appStore";

// ============================================================================
// Preference sync — `language` / `theme` live on the server (user_preferences)
// and in the app store. The server wins on sign-in; local changes are pushed
// best-effort (a failed push never undoes the change on this device).
// ============================================================================

const SCHEME_FROM_THEME = { LIGHT: "light", DARK: "dark", SYSTEM: "system" } as const;
const THEME_FROM_SCHEME: Record<"light" | "dark" | "system", Theme> = { light: "LIGHT", dark: "DARK", system: "SYSTEM" };

/** Server → device. A language this app has no translation for is ignored. */
export async function pullPreferences(): Promise<void> {
  try {
    const prefs = await ProfileClientService.getPreferences();
    const app = useAppStore.getState();
    const scheme = SCHEME_FROM_THEME[prefs.theme];
    if (scheme && scheme !== app.colorScheme) app.setColorScheme(scheme);
    const language = prefs.language.toLowerCase().split("-")[0];
    if ((SUPPORTED_LOCALES as string[]).includes(language) && language !== app.locale) {
      app.setLocale(language);
      await i18n.changeLanguage(language);
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
