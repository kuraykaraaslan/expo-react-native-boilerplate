import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '@/stores/appStore';
import { lightTokens, darkTokens, ThemeTokens } from './tokens';

type ThemeContextValue = {
  tokens: ThemeTokens;
  isDark: boolean;
  colorScheme: 'light' | 'dark' | 'system';
  setColorScheme: (scheme: 'light' | 'dark' | 'system') => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const colorScheme = useAppStore((s) => s.colorScheme);
  const setColorScheme = useAppStore((s) => s.setColorScheme);

  const isDark =
    colorScheme === 'system' ? systemScheme === 'dark' : colorScheme === 'dark';

  const tokens = useMemo(() => (isDark ? darkTokens : lightTokens), [isDark]);

  return (
    <ThemeContext.Provider value={{ tokens, isDark, colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
