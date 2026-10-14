import { useMemo } from "react";
import i18n, { applyLanguageTexts, BUNDLED_LOCALE_META, BUNDLED_LOCALES, hasLanguageTexts, normalizeLocale } from "@/libs/i18n";
import logger from "@/libs/logger";
import { TranslationClientService } from "@/services/i18n/translation.service.client";
import type { RemoteLanguage } from "@/services/i18n/translation.dto";
import { useAppStore } from "@/stores/appStore";
import { useTranslationStore } from "@/stores/translationStore";

// ============================================================================
// Remote translations — keeping the cached language texts in step with the
// server, and switching language only once its texts are on the device.
//   • startup / resume  → syncTranslations(): refresh the language list, then
//                          re-download only the cached languages whose version
//                          changed (plus the one on screen).
//   • user picks a language → selectLanguage(): download it first if needed;
//                          the UI switches only when every text is available.
// Nothing here throws: the bundled + cached texts always keep the app usable.
// ============================================================================

export interface LocaleOption {
  code: string;
  name: string;
  flag: string;
}

/** Below this, a resume does not re-check the server. */
export const SYNC_MIN_INTERVAL_MS = 5 * 60_000;
let lastSyncAt = 0;
let syncInFlight: Promise<void> | null = null;

function remoteLanguage(code: string): RemoteLanguage | undefined {
  return useTranslationStore.getState().languages.find((l) => normalizeLocale(l.code) === code);
}

/** Downloads one language, caches it and puts it on i18next. Returns false on any failure. */
async function downloadLanguage(code: string): Promise<boolean> {
  try {
    const bundle = await TranslationClientService.getBundle(code);
    useTranslationStore.getState().setBundle(code, { version: bundle.version, messages: bundle.messages });
    applyLanguageTexts(code, bundle.messages);
    return true;
  } catch (err: unknown) {
    logger.warn(`[i18n] download of "${code}" failed`, err instanceof Error ? err.message : "unknown");
    return false;
  }
}

async function runSync(): Promise<void> {
  let languages: RemoteLanguage[];
  try {
    languages = await TranslationClientService.getLanguages();
  } catch (err: unknown) {
    logger.warn("[i18n] language list fetch failed — keeping cached texts", err instanceof Error ? err.message : "unknown");
    return;
  }
  const store = useTranslationStore.getState();
  store.setLanguages(languages);
  lastSyncAt = Date.now();

  const offered = new Map(languages.map((l) => [normalizeLocale(l.code), l.version]));
  const active = normalizeLocale(i18n.language ?? "");
  const stale = new Set<string>();
  for (const [code, cached] of Object.entries(store.bundles)) {
    const version = offered.get(code);
    if (version === undefined) {
      // Withdrawn by the server: forget it, unless it is on screen (never yank the UI mid-use).
      if (code !== active) {
        store.removeBundle(code);
        applyLanguageTexts(code, null);
      }
    } else if (version !== cached.version) {
      stale.add(code);
    }
  }
  // The language on screen is kept current even if it was never downloaded (a bundled one).
  if (offered.has(active) && !(active in store.bundles)) stale.add(active);

  await Promise.all([...stale].map(downloadLanguage));
}

/** Refreshes the language list and any outdated cached texts. Never throws. */
export function syncTranslations(options: { force?: boolean } = {}): Promise<void> {
  if (syncInFlight) return syncInFlight;
  if (!options.force && Date.now() - lastSyncAt < SYNC_MIN_INTERVAL_MS) return Promise.resolve();
  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

/**
 * Makes sure `code`'s texts are on the device: downloads them when the server
 * has a newer (or never-downloaded) version. A failed download still succeeds
 * when bundled or older cached texts exist.
 */
export async function ensureLanguage(rawCode: string): Promise<boolean> {
  const code = normalizeLocale(rawCode);
  const remote = remoteLanguage(code);
  const cached = useTranslationStore.getState().bundles[code];
  if (remote && cached?.version !== remote.version) {
    if (await downloadLanguage(code)) return true;
  }
  return hasLanguageTexts(code);
}

/**
 * Switches the UI to `code` once its texts are available; persists the choice on
 * this device. Returns false (and changes nothing) when the language cannot be
 * shown — e.g. offline and never downloaded.
 */
export async function selectLanguage(rawCode: string): Promise<boolean> {
  const code = normalizeLocale(rawCode);
  if (!(await ensureLanguage(code))) return false;
  useAppStore.getState().setLocale(code);
  await i18n.changeLanguage(code);
  return true;
}

/** The languages to offer in pickers: the server's list once known, else the bundled ones. */
export function getAvailableLocales(languages: RemoteLanguage[] = useTranslationStore.getState().languages): LocaleOption[] {
  if (languages.length === 0) {
    return BUNDLED_LOCALES.map((code) => ({ code, ...BUNDLED_LOCALE_META[code] }));
  }
  return languages.map((l) => {
    const code = normalizeLocale(l.code);
    return { code, name: l.name, flag: l.flag ?? BUNDLED_LOCALE_META[code]?.flag ?? "🌐" };
  });
}

/** Reactive getAvailableLocales() for pickers. */
export function useLocales(): LocaleOption[] {
  const languages = useTranslationStore((s) => s.languages);
  return useMemo(() => getAvailableLocales(languages), [languages]);
}

/** Flag + name of one language, for a picker trigger. */
export function localeOption(code: string, options: LocaleOption[]): LocaleOption {
  const normalized = normalizeLocale(code);
  return (
    options.find((o) => o.code === normalized) ?? {
      code: normalized,
      ...(BUNDLED_LOCALE_META[normalized] ?? { flag: "🌐", name: normalized.toUpperCase() }),
    }
  );
}

/** Test hook: forget sync bookkeeping between cases. */
export function resetTranslationSyncForTests(): void {
  lastSyncAt = 0;
  syncInFlight = null;
}
