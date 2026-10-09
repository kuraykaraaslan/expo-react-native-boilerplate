import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";
import type { FlagMap } from "@/services/platform/flags.dto";

// ============================================================================
// Feature-flag cache — the last evaluation per tenant, so gated UI is right on
// the first render after a cold start instead of flickering in. Flags are not
// secrets: MMKV is fine. Unknown flags read as off.
// ============================================================================

interface FlagState {
  /** tenantId → flag key → enabled. */
  byTenant: Record<string, FlagMap>;
  setFlags: (tenantId: string, flags: FlagMap) => void;
  clear: () => void;
}

export const useFlagStore = create<FlagState>()(
  persist(
    (set): FlagState => ({
      byTenant: {},
      setFlags: (tenantId, flags) => set((s) => ({ byTenant: { ...s.byTenant, [tenantId]: flags } })),
      clear: () => set({ byTenant: {} }),
    }),
    {
      name: "flag-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
