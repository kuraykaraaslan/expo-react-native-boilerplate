import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";

// ============================================================================
// App Preferences Store
// Stores user preferences: locale, color scheme, onboarding state.
// ============================================================================

type ColorScheme = "light" | "dark" | "system";

interface AppState {
  locale: string;
  colorScheme: ColorScheme;
  onboardingCompleted: boolean;
  // ── Actions ──────────────────────────────────────────────────────────────
  setLocale: (locale: string) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setOnboardingCompleted: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set): AppState => ({
      locale: "en",
      colorScheme: "system",
      onboardingCompleted: false,

      setLocale: (locale) => set({ locale }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setOnboardingCompleted: (onboardingCompleted) =>
        set({ onboardingCompleted }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        locale: state.locale,
        colorScheme: state.colorScheme,
        onboardingCompleted: state.onboardingCompleted,
      }),
    },
  ),
);
