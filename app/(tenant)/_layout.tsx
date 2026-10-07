import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Organization screens (pick, create, sign in to another one). They live outside
 * (auth) because the (auth) guard bounces signed-in users to the app, and these
 * are used while signed in. A pending OTP or forced password change comes first.
 */
export default function TenantLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const otpRequired = useAuthStore((s) => s.otpRequired);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);

  if (!isAuthenticated) return <Redirect href="/login" />;
  if (otpRequired) return <Redirect href="/2fa" />;
  if (mustChangePassword) return <Redirect href="/change-password" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="select-tenant" />
      <Stack.Screen name="create-tenant" />
      <Stack.Screen name="tenant-login" />
    </Stack>
  );
}
