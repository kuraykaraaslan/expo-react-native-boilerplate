import { Stack } from 'expo-router';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

export default function SettingsLayout() {
  const t = useThemeTokens();

  return (
    <Stack
      screenOptions={{
        headerStyle:    { backgroundColor: t['surface-raised'] },
        headerTintColor: t['text-primary'],
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index"             options={{ title: 'Settings' }} />
      <Stack.Screen name="change-email"      options={{ title: 'Change Email' }} />
      <Stack.Screen name="change-language"   options={{ title: 'Language' }} />
      <Stack.Screen name="sessions"          options={{ title: 'Active Sessions' }} />
      <Stack.Screen name="profile"           options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="tenant/index"      options={{ title: 'Workspace' }} />
      <Stack.Screen name="tenant/members"    options={{ title: 'Members' }} />
      <Stack.Screen name="tenant/invitations" options={{ title: 'Invitations' }} />
    </Stack>
  );
}
