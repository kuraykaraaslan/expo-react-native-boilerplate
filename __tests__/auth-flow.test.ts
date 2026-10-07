import { getSessionIdFromToken } from "@/libs/jwt";
import { pullPreferences, pushPreferences } from "@/libs/preferences";
import { getToken } from "@/libs/secureStorage";
import { startDeviceSession } from "@/libs/session";
import { AuthClientService } from "@/services/auth/auth.service.client";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { describeSession } from "@/utils/session";
import { OTHER_TENANT_ID, TENANT_ID, deviceLoginJson, preferencesJson, sessionsJson, userSecurityJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

beforeEach(async () => {
  await signIn();
  useAuthStore.setState({ mustChangePassword: false, otpMethods: [] });
  useAppStore.setState({ locale: "en", colorScheme: "system" });
});

async function login(overrides: Record<string, unknown> = {}) {
  mockRoute("post", "/auth/device/login", { ...deviceLoginJson, ...overrides });
  return AuthClientService.deviceLogin({ email: "ayse@example.com", password: "x" });
}

describe("session start flags", () => {
  it("writes the tokens before the user is marked signed in", async () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });
    const parsed = await login();
    let tokenAtSignIn: string | null = null;
    const unsubscribe = useAuthStore.subscribe((state, prev) => {
      if (state.isAuthenticated && !prev.isAuthenticated) void getToken("accessToken", TENANT_ID).then((t) => (tokenAtSignIn = t));
    });
    await startDeviceSession(parsed);
    unsubscribe();
    await Promise.resolve();
    expect(tokenAtSignIn).toBe(parsed.accessToken);
  });

  it("flags a forced password change and routes nothing else as open", async () => {
    const result = await startDeviceSession(await login({ mustChangePassword: true }));
    expect(result.mustChangePassword).toBe(true);
    expect(useAuthStore.getState().mustChangePassword).toBe(true);
  });

  it("clears a stale password-change flag on the next clean login", async () => {
    useAuthStore.setState({ mustChangePassword: true });
    await startDeviceSession(await login({ mustChangePassword: false }));
    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });

  it("remembers which second factors the account has while the OTP gate is closed", async () => {
    await startDeviceSession(await login({ otpRequired: true, userSecurity: { ...userSecurityJson, otpMethods: ["TOTP_APP", "EMAIL"] } }));
    expect(useAuthStore.getState()).toMatchObject({ otpRequired: true, otpMethods: ["TOTP_APP", "EMAIL"] });
  });

  it("a successful OTP clears the gate and the remembered methods", () => {
    useAuthStore.getState().requireOtp(["EMAIL"]);
    useAuthStore.getState().clearOtp();
    expect(useAuthStore.getState()).toMatchObject({ otpRequired: false, otpMethods: [] });
  });

  it("logout drops every gate", () => {
    useAuthStore.setState({ otpRequired: true, otpMethods: ["SMS"], mustChangePassword: true });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, otpRequired: false, otpMethods: [], mustChangePassword: false });
  });
});

describe("change password", () => {
  it("a wrong current password (401 INVALID_CREDENTIALS) is an ordinary error, not a session end", async () => {
    const seen = mockRoute("post", "/auth/change-password", () => fail(401, { error: "INVALID_CREDENTIALS" }));
    await expect(AuthClientService.changePassword({ currentPassword: "nope", newPassword: "longenough1" })).rejects.toBeTruthy();
    expect(seen).toHaveLength(1); // no refresh, no replay
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(await getToken("accessToken", TENANT_ID)).not.toBeNull();
  });

  it("sends the current and the new password", async () => {
    const seen = mockRoute("post", "/auth/change-password", { message: "PASSWORD_RESET_SUCCESSFUL" });
    await AuthClientService.changePassword({ currentPassword: "old-password", newPassword: "new-password-1" });
    expect(seen[0].body).toEqual({ currentPassword: "old-password", newPassword: "new-password-1" });
  });
});

describe("reset password", () => {
  it("sends email, resetToken and password (not newPassword)", async () => {
    const seen = mockRoute("post", "/auth/reset-password", { message: "PASSWORD_RESET_SUCCESSFUL" });
    await AuthClientService.resetPassword({ email: "ayse@example.com", resetToken: "tok-123", password: "new-password-1" });
    expect(seen[0].body).toEqual({ email: "ayse@example.com", resetToken: "tok-123", password: "new-password-1" });
    expect(seen[0].headers.authorization).toBeUndefined();
  });
});

describe("describeSession", () => {
  const [app, web] = sessionsJson.sessions;

  it("prefers the device metadata the app sent at login and adds the location", () => {
    expect(describeSession(app as never)).toEqual({ name: "Google Pixel 8 · Android", location: "Istanbul, Türkiye", mobile: true });
  });

  it("falls back to the user agent when there is no metadata", () => {
    expect(describeSession(web as never)).toEqual({ name: "Chrome · Windows", location: null, mobile: false });
  });

  it("returns nothing for a session that says nothing", () => {
    expect(describeSession({ userAgent: null, metadata: null })).toEqual({ name: null, location: null, mobile: false });
  });

  it("marks the current session by the id inside the access token", async () => {
    const token = await getToken("accessToken", TENANT_ID);
    expect(sessionsJson.sessions.find((s) => s.userSessionId === getSessionIdFromToken(token as string))?.tenantId).toBe(TENANT_ID);
    expect(sessionsJson.sessions.some((s) => s.tenantId === OTHER_TENANT_ID)).toBe(true);
  });
});

describe("preference sync", () => {
  it("adopts the account's language and theme", async () => {
    mockRoute("get", "/auth/me/preferences", { userPreferences: { ...preferencesJson, language: "de", theme: "DARK" } });
    await pullPreferences();
    expect(useAppStore.getState()).toMatchObject({ locale: "de", colorScheme: "dark" });
  });

  it("ignores a language the app has no translation for", async () => {
    mockRoute("get", "/auth/me/preferences", { userPreferences: { ...preferencesJson, language: "ja", theme: "LIGHT" } });
    await pullPreferences();
    expect(useAppStore.getState()).toMatchObject({ locale: "en", colorScheme: "light" });
  });

  it("a failed pull leaves the device settings alone", async () => {
    mockRoute("get", "/auth/me/preferences", () => fail(500, { message: "boom" }));
    await expect(pullPreferences()).resolves.toBeUndefined();
    expect(useAppStore.getState()).toMatchObject({ locale: "en", colorScheme: "system" });
  });

  it("pushes only what changed, in the server's enum", async () => {
    const seen = mockRoute("put", "/auth/me/preferences", { userPreferences: preferencesJson });
    await pushPreferences({ colorScheme: "dark" });
    expect(seen[0].body).toEqual({ userPreferences: { theme: "DARK" } });
  });

  it("a failed push does not throw", async () => {
    mockRoute("put", "/auth/me/preferences", () => fail(500, { message: "boom" }));
    await expect(pushPreferences({ language: "tr" })).resolves.toBeUndefined();
  });
});
