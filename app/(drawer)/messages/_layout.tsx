import { Stack } from 'expo-router';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

// Navigation chrome lives in the shared AppHeader; the thread renders its own back link.
export default function MessagesLayout() {
  const t = useThemeTokens();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t['surface-base'] } }} />;
}
