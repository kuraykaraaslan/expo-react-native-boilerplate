import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";
import type { OTPMethod, SafeUser } from "@/services/auth/auth.dto";

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
  /** Second factors the account has enrolled; empty when unknown (e.g. the gate was hit on a restored session). */
  otpMethods: OTPMethod[];
  /** The server demands a new password (expired or admin-forced) — layouts route to /change-password. */
  mustChangePassword: boolean;
  // ── Actions ──────────────────────────────────────────────────────────────
  setUser: (user: SafeUser | null) => void;
  setAuthenticated: (value: boolean) => void;
  requireOtp: (methods?: OTPMethod[]) => void;
  clearOtp: () => void;
  requirePasswordChange: () => void;
  clearPasswordChange: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set): AuthState => ({
      isAuthenticated: false,
      user: null,
      otpRequired: false,
      otpMethods: [],
      mustChangePassword: false,

      setUser: (user) =>
        set({ user, isAuthenticated: user !== null, otpRequired: false }),

      setAuthenticated: (value) =>
        set({ isAuthenticated: value }),

      requireOtp: (methods) => set((state) => ({ otpRequired: true, otpMethods: methods ?? state.otpMethods })),

      clearOtp: () => set({ otpRequired: false, otpMethods: [] }),

      requirePasswordChange: () => set({ mustChangePassword: true }),

      clearPasswordChange: () => set({ mustChangePassword: false }),

      logout: () =>
        set({ isAuthenticated: false, user: null, otpRequired: false, otpMethods: [], mustChangePassword: false }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        otpRequired: state.otpRequired,
        otpMethods: state.otpMethods,
        mustChangePassword: state.mustChangePassword,
      }),
    },
  ),
);
