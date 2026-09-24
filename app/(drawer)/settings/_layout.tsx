import { Stack } from 'expo-router';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

// Navigation chrome lives in the shared AppHeader (appshell-compliance):
// no per-screen stack headers; sub-screens render a back link in ScreenHeader.
export default function SettingsLayout() {
  const t = useThemeTokens();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t['surface-base'] } }} />
  );
}
