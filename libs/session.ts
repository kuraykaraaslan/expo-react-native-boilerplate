import { setTokens } from "@/libs/secureStorage";
import type { DeviceLoginResponse } from "@/services/auth/auth.dto";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Session start — what a successful device login changes on the device.
// Order matters: tokens first (the next request is already authenticated),
// then the active tenant, then who is signed in.
// ============================================================================

/**
 * Persists a device login. Returns whether the server's OTP gate is still
 * closed for this session; in that case the user is signed in but flagged
 * `otpRequired`, and the layout guards keep them on /2fa until it opens.
 */
export async function startDeviceSession(login: DeviceLoginResponse): Promise<{ otpRequired: boolean }> {
  const tenantId = login.tenant.tenantId;
  await setTokens(tenantId, { accessToken: login.accessToken, refreshToken: login.refreshToken });
  useTenantStore.getState().setActiveTenantId(tenantId);
  useAuthStore.getState().setUser(login.user);
  if (login.otpRequired) useAuthStore.getState().requireOtp();
  return { otpRequired: login.otpRequired };
}
