import { configureTheme } from "kui-native/libs/theme";
import logger from "@/libs/logger";
import { BASE_THEME } from "@/libs/theme/brand";
import { deriveBrandTokens, normalizeHex } from "@/libs/theme/brandColor";
import { TenantClientService } from "@/services/tenant/tenant.service.client";
import { useAppliedBrand, useBrandingStore } from "@/stores/brandingStore";

// ============================================================================
// Applying a tenant's brand color to the theme.
// kui-native's configureTheme() merges onto the *defaults* (not onto an earlier
// call) and does not re-render components that are already mounted, so:
//   • the cached color is applied synchronously at startup (before first render),
//   • a tenant switch applies that tenant's cached color immediately,
//   • a color fetched for the tenant already on screen is cached and takes effect
//     on the next launch — the palette never changes under the user mid-task,
//     except the first time a tenant is seen (nothing cached to be consistent with).
// ============================================================================

/** Replaces the theme: base brand + the tenant's derived tokens (or just the base when there are none). */
export function applyBrandColor(primary: string | null): void {
  const derived = primary ? deriveBrandTokens(primary) : null;
  configureTheme({
    light: { ...BASE_THEME.light, ...derived?.light },
    dark: { ...BASE_THEME.dark, ...derived?.dark },
  });
}

/** Synchronous: used at startup and on a tenant switch. */
export function applyCachedBranding(tenantId: string): void {
  applyBrandColor(useBrandingStore.getState().byTenant[tenantId] ?? null);
  useAppliedBrand.getState().setApplied(tenantId);
}

/** Fetches the tenant's public branding and caches its (validated) brand color. Never throws. */
export async function syncBranding(tenantId: string): Promise<void> {
  try {
    const res = await TenantClientService.getPublicBranding(tenantId);
    const raw = normalizeHex(res.settings.brandPrimaryColor);
    const usable = raw && deriveBrandTokens(raw) ? raw : null; // a color we cannot make accessible is treated as unset
    const { byTenant, setBrand } = useBrandingStore.getState();
    const appliedTenantId = useAppliedBrand.getState().appliedTenantId;
    const firstSighting = !(tenantId in byTenant);
    setBrand(tenantId, usable);
    if (appliedTenantId !== tenantId || firstSighting) applyCachedBranding(tenantId);
  } catch (err) {
    logger.warn("[branding] sync failed — keeping the current palette", err); // background, no toast
  }
}
