import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";
import type { TenantMember } from "@/dto/tenant.dto";

// ============================================================================
// Tenant Store
// Stores selected tenant membership and all available memberships.
// ============================================================================

interface TenantState {
  selectedTenantMembership: TenantMember | null;
  memberships: TenantMember[];
  // ── Actions ──────────────────────────────────────────────────────────────
  setMemberships: (memberships: TenantMember[]) => void;
  selectMembership: (membership: TenantMember) => void;
  flush: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set): TenantState => ({
      selectedTenantMembership: null,
      memberships: [],

      setMemberships: (memberships) => set({ memberships }),

      selectMembership: (membership) =>
        set({ selectedTenantMembership: membership }),

      flush: () =>
        set({ selectedTenantMembership: null, memberships: [] }),
    }),
    {
      name: "tenant-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        selectedTenantMembership: state.selectedTenantMembership,
        memberships: state.memberships,
      }),
    },
  ),
);
