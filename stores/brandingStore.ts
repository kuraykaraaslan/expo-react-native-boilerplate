import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandMMKVStorage } from "@/libs/zustandStorage";

// ============================================================================
// Branding cache — the last brand color seen per tenant, so a cold start (and a
// switch back to a known tenant) is themed on the very first render instead of
// flashing the default palette. Colors are not secrets: MMKV is fine.
// ============================================================================

interface BrandingState {
  /** tenantId → validated brand hex ("#rrggbb"), or null when the tenant has no usable color. */
  byTenant: Record<string, string | null>;
  setBrand: (tenantId: string, primary: string | null) => void;
}

export const useBrandingStore = create<BrandingState>()(
  persist(
    (set): BrandingState => ({
      byTenant: {},
      setBrand: (tenantId, primary) => set((s) => ({ byTenant: { ...s.byTenant, [tenantId]: primary } })),
    }),
    {
      name: "branding-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);

/**
 * Which tenant's palette is on the theme right now. Deliberately NOT persisted: it is written
 * at module scope during startup (also in the web server render, where storage must not be
 * touched) and must be re-applied on every launch anyway.
 */
interface AppliedBrandState {
  appliedTenantId: string | null;
  /** Bumped on every apply, even for the same tenant, so the theme root re-renders with the fresh vars. */
  version: number;
  setApplied: (tenantId: string | null) => void;
}

export const useAppliedBrand = create<AppliedBrandState>()((set) => ({
  appliedTenantId: null,
  version: 0,
  setApplied: (appliedTenantId) => set((s) => ({ appliedTenantId, version: s.version + 1 })),
}));
