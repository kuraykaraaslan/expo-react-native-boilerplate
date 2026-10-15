import { useMemo } from "react";
import { toast } from "sonner-native";
import i18n, { applyLanguageTexts, BUNDLED_LOCALE_META, BUNDLED_LOCALES, isBundledLocale, normalizeLocale } from "@/libs/i18n";
import logger from "@/libs/logger";
import { TranslationClientService } from "@/modules/localization/translation.service.client";
import type { RemoteLanguage } from "@/modules/localization/translation.dto";
import { useAppStore } from "@/stores/appStore";
import { useTranslationStore } from "@/stores/translationStore";

// ============================================================================
// Remote translations — keeping the cached module dictionaries in step with the
// server, and switching language only once its texts are on the device.
//   • startup / resume  → syncTranslations(): refresh the language list, then
//                          re-download only the modules whose version changed,
//                          for the cached languages and the one on screen.
//   • user picks a language → selectLanguage(): download its modules first if
//                          needed; the UI switches only when every module is there.
//   • profile language that could not be downloaded → deferLanguage(): retried on
//                          every sync, switched to (with a toast) once complete.
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
/** A language the profile asks for but whose texts could not be downloaded yet. */
let pendingLocale: string | null = null;

function remoteLanguage(code: string): RemoteLanguage | undefined {
  return useTranslationStore.getState().languages.find((l) => normalizeLocale(l.code) === code);
}

/** Modules of a language whose cached version differs from the server's, or that were never downloaded. */
function staleModules(code: string, remote: RemoteLanguage): string[] {
  const cached = useTranslationStore.getState().bundles[code] ?? {};
  return Object.entries(remote.versions)
    .filter(([module, version]) => cached[module]?.version !== version)
    .map(([module]) => module);
}

/** Downloads and caches modules of one language, then refreshes its texts. True when all succeeded. */
async function downloadModules(code: string, modules: string[]): Promise<boolean> {
  if (modules.length === 0) return true;
  const results = await Promise.all(
    modules.map(async (module) => {
      try {
        const bundle = await TranslationClientService.getBundle(code, module);
        useTranslationStore.getState().setBundle(code, module, { version: bundle.version, messages: bundle.messages });
        return true;
      } catch (err: unknown) {
        logger.warn(`[i18n] download of "${code}/${module}" failed`, err instanceof Error ? err.message : "unknown");
        return false;
      }
    }),
  );
  applyLanguageTexts(code);
  return results.every(Boolean);
}

/**
 * True when every text of the language can be shown without the network: it ships
 * in the binary, or every module the server offers for it is cached (any version).
 * Never a half-translated UI for a language the app does not ship.
 */
function isLanguageComplete(code: string, remote: RemoteLanguage | undefined): boolean {
  if (isBundledLocale(code)) return true;
  const cached = useTranslationStore.getState().bundles[code] ?? {};
  if (!remote) return Object.keys(cached).length > 0; // list unknown (offline): trust what was cached
  return Object.keys(remote.versions).every((module) => module in cached);
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

  const offered = new Map(languages.map((l) => [normalizeLocale(l.code), l]));
  const active = normalizeLocale(i18n.language ?? "");
  const targets = new Set<string>();
  for (const [code, modules] of Object.entries(store.bundles)) {
    const remote = offered.get(code);
    if (!remote) {
      // Withdrawn by the server: forget it, unless it is on screen (never yank the UI mid-use).
      if (code !== active) {
        store.removeBundle(code);
        applyLanguageTexts(code);
      }
      continue;
    }
    const dropped = Object.keys(modules).filter((module) => !(module in remote.versions));
    for (const module of dropped) store.removeBundle(code, module);
    if (dropped.length > 0) applyLanguageTexts(code);
    targets.add(code);
  }
  // The language on screen is kept current even if it was never downloaded (a bundled one).
  if (offered.has(active)) targets.add(active);

  await Promise.all([...targets].map((code) => downloadModules(code, staleModules(code, offered.get(code)!))));
  await retryPendingLanguage();
}

async function retryPendingLanguage(): Promise<void> {
  const code = pendingLocale;
  if (!code) return;
  if (!isLanguageOffered(code)) {
    pendingLocale = null; // withdrawn by the server: it can never be shown
    return;
  }
  // Still incomplete, or the user picked another language in the meantime.
  if (!(await ensureLanguage(code)) || pendingLocale !== code) return;
  pendingLocale = null;
  await switchTo(code);
  toast.success(i18n.t("user.preferences.languageSwitched", { language: localeName(code) }));
}

/** Refreshes the language list and any outdated cached modules. Never throws. */
export function syncTranslations(options: { force?: boolean } = {}): Promise<void> {
  if (syncInFlight) return syncInFlight;
  // A pending language is retried on every resume, not only every few minutes.
  const throttled = Date.now() - lastSyncAt < SYNC_MIN_INTERVAL_MS;
  if (!options.force && !pendingLocale && throttled) return Promise.resolve();
  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

/**
 * Makes sure `code`'s texts are on the device: downloads every module the server
 * has a newer (or never-downloaded) version of. A failed download still succeeds
 * when the language is bundled or older cached modules cover it completely.
 */
export async function ensureLanguage(rawCode: string): Promise<boolean> {
  const code = normalizeLocale(rawCode);
  const remote = remoteLanguage(code);
  if (remote) await downloadModules(code, staleModules(code, remote));
  return isLanguageComplete(code, remote);
}

/**
 * Switches the UI to `code` once its texts are available; persists the choice on
 * this device. Returns false (and changes nothing) when the language cannot be
 * shown — e.g. offline and never downloaded.
 */
export async function selectLanguage(rawCode: string): Promise<boolean> {
  const code = normalizeLocale(rawCode);
  const { setSwitchingTo } = useTranslationStore.getState();
  setSwitchingTo(code);
  try {
    if (!(await ensureLanguage(code))) return false;
    await switchTo(code);
    return true;
  } finally {
    setSwitchingTo(null);
  }
}

async function switchTo(code: string): Promise<void> {
  useAppStore.getState().setLocale(code);
  await i18n.changeLanguage(code);
}

/** True when the binary or the server offers `code` — or the server's list is not known yet. */
export function isLanguageOffered(rawCode: string): boolean {
  const code = normalizeLocale(rawCode);
  const { languages } = useTranslationStore.getState();
  return isBundledLocale(code) || languages.length === 0 || languages.some((l) => normalizeLocale(l.code) === code);
}

/** Remembers a language that could not be downloaded yet; the next syncs retry it. */
export function deferLanguage(rawCode: string): void {
  pendingLocale = normalizeLocale(rawCode);
}

export function getPendingLanguage(): string | null {
  return pendingLocale;
}

/** The user chose a language themselves: a deferred one must no longer take over. */
export function clearPendingLanguage(): void {
  pendingLocale = null;
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

/** Endonym of a language, for messages ("Български"). */
export function localeName(code: string): string {
  return localeOption(code, getAvailableLocales()).name;
}

/** Test hook: forget sync bookkeeping between cases. */
export function resetTranslationSyncForTests(): void {
  lastSyncAt = 0;
  syncInFlight = null;
  pendingLocale = null;
}
