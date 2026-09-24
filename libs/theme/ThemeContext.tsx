import React, { useEffect } from 'react';
import { View } from 'react-native';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import { themes, useResolvedScheme, useThemeMode } from 'kui-native/libs/theme';
import { useAppStore } from '@/stores/appStore';

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useResolvedScheme();

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
