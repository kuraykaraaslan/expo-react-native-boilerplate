import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const otpRequired = useAuthStore((s) => s.otpRequired);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);

  // A session waiting on OTP or a forced password change stays in this group
  // so /2fa and /change-password are reachable.
  if (isAuthenticated && !otpRequired && !mustChangePassword) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="2fa" />
      <Stack.Screen name="select-tenant" />
      <Stack.Screen name="create-tenant" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
