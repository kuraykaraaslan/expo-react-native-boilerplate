import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";
import type { FlagMap } from "@/modules/feature_flags/feature_flags.dto";

// ============================================================================
// Feature-flag cache — the last evaluation per tenant, so a cold start shows the
// right gated UI at once instead of "everything off" until the request returns.
// A flag that is absent (unknown, or never evaluated) is OFF.
// ============================================================================

interface FlagState {
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
    { name: "flag-storage", storage: createJSONStorage(() => zustandMMKVStorage) },
  ),
);
