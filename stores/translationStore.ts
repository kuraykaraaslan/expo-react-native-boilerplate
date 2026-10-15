import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";
import type { Messages, RemoteLanguage } from "@/modules/localization/translation.dto";

// ============================================================================
// Translation cache — the server's language list and every module dictionary
// downloaded so far. Persisted in MMKV (read synchronously at startup), so a
// chosen language is on screen from the first render and never waits for the
// network. Texts are not secrets: MMKV is fine.
// ============================================================================

export interface CachedBundle {
  version: string;
  messages: Messages;
}

interface TranslationState {
  /** Last language list the server returned; empty until the first successful fetch. */
  languages: RemoteLanguage[];
  /** language code → module → last downloaded dictionary. */
  bundles: Record<string, Record<string, CachedBundle>>;
  /** Language being downloaded for a switch right now (pickers show a spinner). Not persisted. */
  switchingTo: string | null;
  setSwitchingTo: (code: string | null) => void;
  setLanguages: (languages: RemoteLanguage[]) => void;
  setBundle: (code: string, module: string, bundle: CachedBundle) => void;
  /** Forgets one module of a language, or the whole language when `module` is omitted. */
  removeBundle: (code: string, module?: string) => void;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set): TranslationState => ({
      languages: [],
      bundles: {},
      switchingTo: null,
      setSwitchingTo: (switchingTo) => set({ switchingTo }),
      setLanguages: (languages) => set({ languages }),
      setBundle: (code, module, bundle) =>
        set((s) => ({ bundles: { ...s.bundles, [code]: { ...s.bundles[code], [module]: bundle } } })),
      removeBundle: (code, module) =>
        set((s) => {
          const { [code]: language, ...rest } = s.bundles;
          if (module === undefined || !language) return { bundles: rest };
          const { [module]: _removed, ...modules } = language;
          return { bundles: { ...rest, [code]: modules } };
        }),
    }),
    {
      name: "translation-storage",
      // v2: flat next-boilerplate keys ("auth.login.title"). An older cache (v0: one
      // bundle per language, v1: nested keys) is dropped and downloaded again; the
      // bundled dictionaries cover the meantime.
      version: 2,
      migrate: () => ({ languages: [], bundles: {} }),
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({ languages: state.languages, bundles: state.bundles }),
    },
  ),
);
