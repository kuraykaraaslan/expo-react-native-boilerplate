import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";
import type { SafeUser } from "@/dto/auth.dto";

// ============================================================================
// Auth Store
// Stores user profile and authentication state.
// TOKENS ARE NEVER STORED HERE — they live in SecureStore only.
// ============================================================================

interface AuthState {
  isAuthenticated: boolean;
  user: SafeUser | null;
  // ── Actions ──────────────────────────────────────────────────────────────
  setUser: (user: SafeUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set): AuthState => ({
      isAuthenticated: false,
      user: null,

      setUser: (user) =>
        set({ user, isAuthenticated: user !== null }),

      setAuthenticated: (value) =>
        set({ isAuthenticated: value }),

      logout: () =>
        set({ isAuthenticated: false, user: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
);
