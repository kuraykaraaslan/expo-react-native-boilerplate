import { useEffect } from "react";
import { AppState } from "react-native";
import { env } from "@/libs/env";
import logger from "@/libs/logger";
import { FlagsClientService } from "@/services/platform/flags.service.client";
import { useFlagStore } from "@/stores/flagStore";
import { getActiveTenantId, useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Feature flags for the active tenant. Screens only read `useFeatureFlag(key)`:
// `false` until the server has said otherwise, the cached last answer meanwhile,
// and `false` again if the key is unknown or the call fails with nothing cached.
// ============================================================================

/** Evaluates the active tenant's flags and caches them. A failure keeps the last cached value. */
export async function refreshFlags(): Promise<void> {
  const tenantId = getActiveTenantId();
  try {
    const flags = await FlagsClientService.evaluateAll();
    // The user switched organization while this was in flight: that answer belongs to the old tenant.
    if (getActiveTenantId() !== tenantId) return;
    useFlagStore.getState().setFlags(tenantId, flags);
  } catch (err) {
    logger.warn("[flags] evaluation failed, keeping cached flags", err); // background — no toast
  }
}

export function useFeatureFlag(key: string): boolean {
  const tenantId = useTenantStore((s) => s.activeTenantId) ?? env.EXPO_PUBLIC_DEFAULT_TENANT_ID;
  return useFlagStore((s) => s.byTenant[tenantId]?.[key] === true);
}

/** Mount once under the signed-in shell: refreshes on mount, tenant switch and app resume. */
export function useFlagsSync(enabled: boolean): void {
  const tenantId = useTenantStore((s) => s.activeTenantId);

  useEffect(() => {
    if (!enabled) return;
    void refreshFlags();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshFlags();
    });
    return () => sub.remove();
  }, [enabled, tenantId]);
}
