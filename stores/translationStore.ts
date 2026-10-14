import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";
import type { RemoteLanguage, TranslationTree } from "@/services/i18n/translation.dto";

// ============================================================================
// Translation cache — the server's language list and every language bundle
// downloaded so far. Persisted in MMKV (read synchronously at startup), so a
// chosen language is on screen from the first render and never waits for the
// network. Texts are not secrets: MMKV is fine.
// ============================================================================

export interface CachedBundle {
  version: string;
  messages: TranslationTree;
}

interface TranslationState {
  /** Last language list the server returned; empty until the first successful fetch. */
  languages: RemoteLanguage[];
  /** code → last downloaded bundle. */
  bundles: Record<string, CachedBundle>;
  setLanguages: (languages: RemoteLanguage[]) => void;
  setBundle: (code: string, bundle: CachedBundle) => void;
  removeBundle: (code: string) => void;
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set): TranslationState => ({
      languages: [],
      bundles: {},
      setLanguages: (languages) => set({ languages }),
      setBundle: (code, bundle) => set((s) => ({ bundles: { ...s.bundles, [code]: bundle } })),
      removeBundle: (code) =>
        set((s) => {
          const { [code]: _removed, ...rest } = s.bundles;
          return { bundles: rest };
        }),
    }),
    {
      name: "translation-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({ languages: state.languages, bundles: state.bundles }),
    },
  ),
);
