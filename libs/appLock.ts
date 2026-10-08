import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";

// ============================================================================
// App lock (S2): a UI gate in front of an already-open session.
// It never replaces the server session, stores no credential and never signs
// the user out: a cancelled or failed biometric prompt just keeps the UI locked.
// Only the on/off preference is persisted (MMKV — it is not a secret).
// ============================================================================

/** How long the app may stay in the background before it locks again. */
export const APP_LOCK_GRACE_MS = 30_000;

/** Pure rule: lock when the app was backgrounded for at least the grace period. */
export function shouldLock(enabled: boolean, backgroundedAt: number | null, now: number, graceMs: number = APP_LOCK_GRACE_MS): boolean {
  return enabled && backgroundedAt !== null && now - backgroundedAt >= graceMs;
}

interface AppLockState {
  enabled: boolean;
  /** Not persisted: a cold start with the lock enabled always begins locked (see `merge`). */
  locked: boolean;
  backgroundedAt: number | null;
  setEnabled: (enabled: boolean) => void;
  lock: () => void;
  unlock: () => void;
  markBackgrounded: (at: number) => void;
  /** Called when the app returns to the foreground: locks if it was away long enough. */
  markForegrounded: (now: number) => void;
  reset: () => void;
}

export const useAppLockStore = create<AppLockState>()(
  persist(
    (set, get): AppLockState => ({
      enabled: false,
      locked: false,
      backgroundedAt: null,
      setEnabled: (enabled) => set({ enabled, locked: false, backgroundedAt: null }),
      lock: () => set({ locked: get().enabled }),
      unlock: () => set({ locked: false, backgroundedAt: null }),
      // Keep the first timestamp: iOS reports "inactive" then "background" for one departure.
      markBackgrounded: (at) => set({ backgroundedAt: get().backgroundedAt ?? at }),
      markForegrounded: (now) => {
        const { enabled, backgroundedAt } = get();
        set({ backgroundedAt: null, ...(shouldLock(enabled, backgroundedAt, now) ? { locked: true } : {}) });
      },
      reset: () => set({ enabled: false, locked: false, backgroundedAt: null }),
    }),
    {
      name: "app-lock-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({ enabled: state.enabled }),
      merge: (persisted, current) => {
        const enabled = (persisted as { enabled?: boolean } | undefined)?.enabled ?? false;
        return { ...current, enabled, locked: enabled };
      },
    },
  ),
);
