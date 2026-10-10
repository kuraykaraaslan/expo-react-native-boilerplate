import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";

// ============================================================================
// Push Store
// Install-level push state, persisted in MMKV. Holds NO push token and no auth token: the Expo token is
// re-read from expo-notifications whenever it is needed, and the server de-duplicates by it.
// ============================================================================

interface PushState {
  /** Stable id of this install, sent as `deviceId`; created on first registration. */
  deviceId: string | null;
  /** The person's switch for THIS device (settings). Off → nothing is registered. */
  enabled: boolean;
  /** The pre-prompt was answered "not now": do not ask again on every launch. */
  promptDismissed: boolean;
  /** tenantId → ISO time of the last successful registration for that organization. */
  registered: Record<string, string>;
  // ── Actions ──────────────────────────────────────────────────────────────
  ensureDeviceId: () => string;
  setEnabled: (enabled: boolean) => void;
  dismissPrompt: () => void;
  markRegistered: (tenantId: string) => void;
  clearRegistrations: () => void;
}

function newDeviceId(): string {
  return `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
}

export const usePushStore = create<PushState>()(
  persist(
    (set, get): PushState => ({
      deviceId: null,
      enabled: true,
      promptDismissed: false,
      registered: {},

      ensureDeviceId: () => {
        const existing = get().deviceId;
        if (existing) return existing;
        const created = newDeviceId();
        set({ deviceId: created });
        return created;
      },
      setEnabled: (enabled) => set({ enabled }),
      dismissPrompt: () => set({ promptDismissed: true }),
      markRegistered: (tenantId) => set((s) => ({ registered: { ...s.registered, [tenantId]: new Date().toISOString() } })),
      clearRegistrations: () => set({ registered: {} }),
    }),
    {
      name: "push-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        deviceId: state.deviceId,
        enabled: state.enabled,
        promptDismissed: state.promptDismissed,
        registered: state.registered,
      }),
    },
  ),
);
