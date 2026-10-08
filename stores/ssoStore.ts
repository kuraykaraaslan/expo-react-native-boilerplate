import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";

// ============================================================================
// SSO Store
// The OAuth `state` of the flow in progress. Persisted (MMKV) so it survives the
// app being backgrounded while the browser is open; in memory it would be lost
// and every return would be rejected as a state mismatch.
// ============================================================================

interface SSOState {
  pendingState: string | null;
  setPendingState: (state: string | null) => void;
}

export const useSSOStore = create<SSOState>()(
  persist(
    (set): SSOState => ({
      pendingState: null,
      setPendingState: (pendingState) => set({ pendingState }),
    }),
    { name: "sso-storage", storage: createJSONStorage(() => zustandMMKVStorage) },
  ),
);
