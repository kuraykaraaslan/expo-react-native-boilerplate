import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { env } from "@/libs/env";
import { zustandMMKVStorage } from "@/libs/zustandStorage";
import type { TenantMembership } from "@/services/tenant/tenant.dto";

// ============================================================================
// Tenant Store
// Selected membership, all memberships, and which tenant requests go to.
// A device token is bound to one tenant (K2), so the active tenant decides
// both the URL prefix and which SecureStore token pair is sent.
// ============================================================================

interface TenantState {
  selectedTenantMembership: TenantMembership | null;
  memberships: TenantMembership[];
  /** Tenant requests are addressed to; null → EXPO_PUBLIC_DEFAULT_TENANT_ID. */
  activeTenantId: string | null;
  /** Every tenant a token pair was ever stored for — SecureStore can't list keys. */
  knownTenantIds: string[];
  // ── Actions ──────────────────────────────────────────────────────────────
  setMemberships: (memberships: TenantMembership[]) => void;
  selectMembership: (membership: TenantMembership) => void;
  setActiveTenantId: (tenantId: string) => void;
  rememberTenant: (tenantId: string) => void;
  forgetTenant: (tenantId: string) => void;
  flush: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set): TenantState => ({
      selectedTenantMembership: null,
      memberships: [],
      activeTenantId: null,
      knownTenantIds: [],

      setMemberships: (memberships) => set({ memberships }),

      selectMembership: (membership) =>
        set({ selectedTenantMembership: membership }),

      setActiveTenantId: (activeTenantId) => set({ activeTenantId }),

      rememberTenant: (tenantId) =>
        set((s) => (s.knownTenantIds.includes(tenantId) ? s : { knownTenantIds: [...s.knownTenantIds, tenantId] })),

      forgetTenant: (tenantId) =>
        set((s) => ({ knownTenantIds: s.knownTenantIds.filter((id) => id !== tenantId) })),

      // Keeps knownTenantIds: clearAllTokens still needs it after a logout.
      flush: () =>
        set({ selectedTenantMembership: null, memberships: [], activeTenantId: null }),
    }),
    {
      name: "tenant-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        selectedTenantMembership: state.selectedTenantMembership,
        memberships: state.memberships,
        activeTenantId: state.activeTenantId,
        knownTenantIds: state.knownTenantIds,
      }),
    },
  ),
);

/** Tenant for the next request — never undefined (store not hydrated → default tenant). */
export function getActiveTenantId(): string {
  return useTenantStore.getState().activeTenantId ?? env.EXPO_PUBLIC_DEFAULT_TENANT_ID;
}
