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
  /** Session exists but the server's OTP gate is closed (401 OTP_REQUIRED) — layouts route to /2fa. */
  otpRequired: boolean;
  // ── Actions ──────────────────────────────────────────────────────────────
  setUser: (user: SafeUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  requireOtp: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set): AuthState => ({
      isAuthenticated: false,
      user: null,
      otpRequired: false,

      setUser: (user) =>
        set({ user, isAuthenticated: user !== null, otpRequired: false }),

      setAuthenticated: (value) =>
        set({ isAuthenticated: value }),

      requireOtp: () => set({ otpRequired: true }),

      logout: () =>
        set({ isAuthenticated: false, user: null, otpRequired: false }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        otpRequired: state.otpRequired,
      }),
    },
  ),
);
