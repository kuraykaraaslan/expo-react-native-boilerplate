import React, { useEffect } from 'react';
import { View } from 'react-native';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import { themes, useResolvedScheme, useThemeMode } from 'kui-native/libs/theme';
import { useAppStore } from '@/stores/appStore';
import { useAppliedBrand } from '@/stores/brandingStore';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { applyCachedBranding, syncBranding } from '@/libs/theme/branding';

export { useThemeTokens } from 'kui-native/libs/theme';

// ============================================================================
// Theme — kui-native tokens, driven by the persisted preference in appStore.
// Raw hex for props that can't take a className: useThemeTokens(), re-exported
// here so app code never imports kui-native directly.
// ============================================================================

// appStore (MMKV) is the source of truth; kui-native's mode store follows it.
// MMKV hydrates synchronously, so this runs before the first render.
useThemeMode.getState().setMode(useAppStore.getState().colorScheme);
useAppStore.subscribe((s) => useThemeMode.getState().setMode(s.colorScheme));

// The tenant's cached brand color goes on before the first render, like the base palette.
applyCachedBranding(getActiveTenantId());

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useResolvedScheme();
  const activeTenantId = useTenantStore((s) => s.activeTenantId) ?? getActiveTenantId();
  useAppliedBrand((s) => s.version); // re-render (fresh theme vars) whenever a palette is applied

  // A switch applies that tenant's cached palette at once, then its public branding is refreshed.
  useEffect(() => {
    if (useAppliedBrand.getState().appliedTenantId !== activeTenantId) applyCachedBranding(activeTenantId);
    void syncBranding(activeTenantId);
  }, [activeTenantId]);

  // Keep NativeWind's scheme in sync for any `dark:` variants.
  useEffect(() => {
    nativewindColorScheme.set(scheme);
  }, [scheme]);

  return (
    <View style={themes[scheme]} className="flex-1 bg-surface-base">
      {children}
    </View>
  );
}

export function useTheme() {
  const isDark = useResolvedScheme() === 'dark';
  const colorScheme = useAppStore((s) => s.colorScheme);
  const setColorScheme = useAppStore((s) => s.setColorScheme);
  return { isDark, colorScheme, setColorScheme };
}
