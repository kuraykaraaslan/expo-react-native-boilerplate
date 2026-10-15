import { useEffect } from "react";
import { AppState } from "react-native";
import logger from "@/libs/logger";
import { FeatureFlagsClientService } from "@/modules/feature_flags/feature_flags.service.client";
import { useFlagStore } from "@/stores/flagStore";
import { getActiveTenantId, useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Feature flags for screens: `useFeatureFlag("some-key")` is the only thing a
// screen reads. Evaluated on sign-in/mount, on a tenant switch and on resume
// (throttled); a failed refresh keeps the last cached value; an unknown or
// never-evaluated flag is OFF, so gated UI never appears by accident.
// ============================================================================

/** Minimum time between two refreshes triggered by resuming the app. */
export const FLAGS_RESUME_THROTTLE_MS = 60_000;

let lastRefreshAt = 0;

/** Evaluates the active tenant's flags and caches them. Never throws. */
export async function refreshFlags(): Promise<void> {
  const tenantId = getActiveTenantId();
  lastRefreshAt = Date.now();
  try {
    const flags = await FeatureFlagsClientService.evaluateAll();
    // The user switched organization while this was in flight: those are the old tenant's answers.
    if (getActiveTenantId() !== tenantId) return;
    useFlagStore.getState().setFlags(tenantId, flags);
  } catch (err) {
    logger.warn("[flags] refresh failed — keeping the cached values", err); // background, no toast
  }
}

/** True only when the active tenant's cached evaluation says the flag is on. */
export function useFeatureFlag(key: string): boolean {
  const tenantId = useTenantStore((s) => s.activeTenantId) ?? getActiveTenantId();
  return useFlagStore((s) => s.byTenant[tenantId]?.[key] ?? false);
}

/** Mount once inside the signed-in shell. */
export function useFlagsSync(): void {
  const tenantId = useTenantStore((s) => s.activeTenantId);

  useEffect(() => {
    void refreshFlags();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() - lastRefreshAt >= FLAGS_RESUME_THROTTLE_MS) void refreshFlags();
    });
    return () => sub.remove();
  }, [tenantId]);
}
