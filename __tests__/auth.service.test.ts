import { getSessionIdFromToken } from "@/libs/jwt";
import { getToken, setTokens } from "@/libs/secureStorage";
import { startDeviceSession } from "@/libs/session";
import { AuthClientService } from "@/services/auth/auth.service.client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { OTHER_TENANT_ID, SESSION_ID, TENANT_ID, deviceLoginJson, makeJwt, safeUserJson, sessionJson, sessionsJson, userSecurityJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

beforeEach(() => signIn());

describe("deviceLogin", () => {
  it("posts to the device route with the device info, no bearer token, and parses the nine fields", async () => {
    const seen = mockRoute("post", "/auth/device/login", deviceLoginJson);

    const res = await AuthClientService.deviceLogin({
      email: "ayse@example.com",
      password: "secret",
      rememberMe: true,
      device: { type: "phone", brand: "Google", model: "Pixel 8", os: "Android", osVersion: "16", appVersion: "1.0.0" },
    });

    expect(seen).toHaveLength(1);
    expect(seen[0].path).toBe("/auth/device/login");
    expect(seen[0].headers.authorization).toBeUndefined(); // login is unauthenticated
    expect(seen[0].headers.cookie).toBeUndefined();
    expect(seen[0].body).toEqual({
      email: "ayse@example.com",
      password: "secret",
      rememberMe: true,
      device: { type: "phone", brand: "Google", model: "Pixel 8", os: "Android", osVersion: "16", appVersion: "1.0.0" },
    });
    expect(res.otpRequired).toBe(false);
    expect(res.tenant).toEqual({ tenantId: TENANT_ID, name: "Acme Studio" });
    expect(res.tenantMember.memberRole).toBe("OWNER");
    expect(res.user.userProfile?.name).toBe("Ayşe Yılmaz"); // name lives under userProfile
    expect(res.userSecurity.otpMethods).toEqual(["EMAIL"]);
    expect(res.passwordExpiresInDays).toBe(12);
  });

  it("addresses the tenant it is told to, not only the active one", async () => {
    const seen = mockRoute("post", "/auth/device/login", deviceLoginJson);
    await AuthClientService.deviceLogin({ email: "ayse@example.com", password: "x" }, OTHER_TENANT_ID);
    expect(seen[0].tenantId).toBe(OTHER_TENANT_ID);
  });

  it("a wrong password (401 INVALID_CREDENTIALS) is an error, not a session end", async () => {
    mockRoute("post", "/auth/device/login", () => fail(401, { message: "INVALID_CREDENTIALS", code: "UNAUTHORIZED" }));
    await expect(AuthClientService.deviceLogin({ email: "a@b.co", password: "bad" })).rejects.toBeDefined();
    expect(useAuthStore.getState().isAuthenticated).toBe(true); // untouched
    expect(await getToken("accessToken", TENANT_ID)).not.toBeNull();
  });
});

describe("startDeviceSession", () => {
  it("stores the pair under the tenant, activates it and signs the user in", async () => {
    useAuthStore.setState({ isAuthenticated: false, user: null, otpRequired: false });
    useTenantStore.setState({ activeTenantId: null });

    const parsed = await AuthClientService.deviceLogin({ email: "ayse@example.com", password: "x" });
    const { otpRequired } = await startDeviceSession(parsed);

    expect(otpRequired).toBe(false);
    expect(await getToken("accessToken", TENANT_ID)).toBe(parsed.accessToken);
    expect(await getToken("refreshToken", TENANT_ID)).toBe("refresh-1");
    expect(useTenantStore.getState().activeTenantId).toBe(TENANT_ID);
    expect(useTenantStore.getState().knownTenantIds).toContain(TENANT_ID);
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, otpRequired: false });
  });

  it("keeps the OTP gate closed when the server says otpRequired", async () => {
    const parsed = await AuthClientService.deviceLogin({ email: "ayse@example.com", password: "x" });
    const { otpRequired } = await startDeviceSession({ ...parsed, otpRequired: true });
    expect(otpRequired).toBe(true);
    expect(useAuthStore.getState().otpRequired).toBe(true);
  });
});

describe("register / session", () => {
  it("register sends no name and parses the 201 body", async () => {
    const seen = mockRoute("post", "/auth/register", {
      message: "Registration successful",
      user: { userId: "u2", email: "n@example.com" },
      tenant: { tenantId: TENANT_ID, name: "Acme Studio" },
    });
    const res = await AuthClientService.register({ email: "n@example.com", password: "longenough", consentVersion: "2026-01" });
    expect(seen[0].body).toEqual({ email: "n@example.com", password: "longenough", consentVersion: "2026-01" });
    expect(res.user.userId).toBe("u2");
  });

  it("getSession returns the slim user plus tenant and membership", async () => {
    const seen = mockRoute("get", "/auth/session", sessionJson);
    const res = await AuthClientService.getSession();
    expect(seen[0].headers.authorization).toMatch(/^Bearer /);
    expect(res.user).toEqual({ userId: sessionJson.user.userId, email: "ayse@example.com", userRole: "USER" });
    expect(res.tenantMember.memberRole).toBe("OWNER");
  });
});

describe("OTP and TOTP", () => {
  it("sendOTP always sends an action", async () => {
    const seen = mockRoute("post", "/auth/otp/send", { message: "OTP_SENT_SUCCESSFULLY" });
    await AuthClientService.sendOTP("EMAIL", "authenticate");
    expect(seen[0].body).toEqual({ method: "EMAIL", action: "authenticate" });
  });

  it("verifyOTP sends { method, action, otpToken } and returns nothing (the reply has no user)", async () => {
    const seen = mockRoute("post", "/auth/otp/verify", { message: "OTP_VERIFIED_SUCCESSFULLY" });
    await expect(AuthClientService.verifyOTP("SMS", "authenticate", "123456")).resolves.toBeUndefined();
    expect(seen[0].body).toEqual({ method: "SMS", action: "authenticate", otpToken: "123456" });
  });

  it("verifyOTP rejects a too-short code before any request", async () => {
    const seen = mockRoute("post", "/auth/otp/verify", {});
    await expect(AuthClientService.verifyOTP("EMAIL", "authenticate", "12")).rejects.toBeDefined();
    expect(seen).toHaveLength(0);
  });

  it("TOTP setup / enable / disable", async () => {
    mockRoute("post", "/auth/totp/setup", { message: "TOTP_SETUP_INITIATED", secret: "JBSWY3DP", otpauthUrl: "otpauth://totp/Acme:ayse?secret=JBSWY3DP" });
    mockRoute("post", "/auth/totp/enable", { message: "TOTP_ENABLED_SUCCESSFULLY", backupCodes: ["a1b2c3d4", "e5f6a7b8"] });
    const disable = mockRoute("post", "/auth/totp/disable", { message: "TOTP_DISABLED_SUCCESSFULLY" });

    expect((await AuthClientService.setupTOTP()).secret).toBe("JBSWY3DP");
    expect((await AuthClientService.enableTOTP("123456")).backupCodes).toHaveLength(2);
    await AuthClientService.disableTOTP("654321");
    expect(disable[0].body).toEqual({ otpToken: "654321" });
  });
});

describe("passwords", () => {
  it("resetPassword sends `password` — the route maps it to newPassword itself", async () => {
    const seen = mockRoute("post", "/auth/reset-password", { message: "PASSWORD_RESET_SUCCESSFUL" });
    await AuthClientService.resetPassword({ email: "ayse@example.com", resetToken: "tok", password: "new-password-1" });
    expect(seen[0].body).toEqual({ email: "ayse@example.com", resetToken: "tok", password: "new-password-1" });
    expect(seen[0].headers.authorization).toBeUndefined();
  });

  it("forgotPassword is public", async () => {
    const seen = mockRoute("post", "/auth/forgot-password", { message: "FORGOT_PASSWORD_SUCCESSFUL" });
    await AuthClientService.forgotPassword({ email: "ayse@example.com" });
    expect(seen[0].body).toEqual({ email: "ayse@example.com" });
    expect(seen[0].headers.authorization).toBeUndefined();
  });

  it("changePassword sends { currentPassword, newPassword }; a wrong current password does not end the session", async () => {
    const ok = mockRoute("post", "/auth/change-password", { message: "PASSWORD_RESET_SUCCESSFUL" });
    await AuthClientService.changePassword({ currentPassword: "old", newPassword: "new-password-1" });
    expect(ok[0].body).toEqual({ currentPassword: "old", newPassword: "new-password-1" });

    mockRoute("post", "/auth/change-password", () => fail(401, { error: "INVALID_CREDENTIALS" })); // body shape 3, status 401
    await expect(AuthClientService.changePassword({ currentPassword: "wrong", newPassword: "new-password-1" })).rejects.toBeDefined();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(await getToken("refreshToken", TENANT_ID)).not.toBeNull();
  });
});

describe("sessions", () => {
  it("getSessions parses device metadata, geo, other organizations' sessions and unknown keys", async () => {
    mockRoute("get", "/auth/me/sessions", sessionsJson);
    const sessions = await AuthClientService.getSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].metadata?.device).toMatchObject({ brand: "Google", model: "Pixel 8", os: "Android" });
    expect(sessions[0].metadata?.geo?.city).toBe("Istanbul");
    expect(sessions[1].tenantId).toBe(OTHER_TENANT_ID);
    expect(sessions[1].metadata).toBeNull();
    expect(sessions[1].otpVerifyNeeded).toBe(false); // null → false
  });

  it("revokeSession deletes by id", async () => {
    const seen = mockRoute("delete", "/auth/me/sessions/:id", { message: "Session revoked.", isCurrentSession: false });
    const res = await AuthClientService.revokeSession("abc");
    expect(seen[0].path).toBe("/auth/me/sessions/abc");
    expect(res.isCurrentSession).toBe(false);
  });

  it("getSecurity returns SafeUserSecurity", async () => {
    mockRoute("get", "/auth/me/security", { message: "OK", userSecurity: userSecurityJson });
    const sec = await AuthClientService.getSecurity();
    expect(sec.otpMethods).toEqual(["EMAIL"]);
    expect(sec.mustChangePassword).toBe(false);
    expect(sec.trustedDevices).toHaveLength(1);
  });
});

describe("logout", () => {
  it("revokes THIS session by the id inside the access token (POST /auth/logout is a no-op for bearer tokens)", async () => {
    const del = mockRoute("delete", "/auth/me/sessions/:id", { message: "Session revoked.", isCurrentSession: true });
    const post = mockRoute("post", "/auth/logout", { success: true });

    await AuthClientService.logout();

    expect(del).toHaveLength(1);
    expect(del[0].path).toBe(`/auth/me/sessions/${SESSION_ID}`);
    expect(del[0].tenantId).toBe(TENANT_ID);
    expect(del[0].headers.authorization).toMatch(/^Bearer /);
    expect(post).toHaveLength(0);
  });

  it("addresses the tenant whose session it revokes", async () => {
    await signIn(OTHER_TENANT_ID);
    const del = mockRoute("delete", "/auth/me/sessions/:id", { message: "Session revoked." });
    await AuthClientService.logout(OTHER_TENANT_ID);
    expect(del[0].tenantId).toBe(OTHER_TENANT_ID);
  });

  it("does nothing on the server when no session id can be read", async () => {
    await signIn();
    await setTokens(TENANT_ID, { accessToken: "not-a-jwt", refreshToken: "r" });
    const del = mockRoute("delete", "/auth/me/sessions/:id", {});
    await AuthClientService.logout();
    expect(del).toHaveLength(0);
  });
});

describe("jwt", () => {
  it("reads userSessionId from the payload and tolerates junk", () => {
    expect(getSessionIdFromToken(makeJwt({ userSessionId: "s-1", ünïcode: "ş" }))).toBe("s-1");
    expect(getSessionIdFromToken("garbage")).toBeNull();
    expect(getSessionIdFromToken(makeJwt({ other: 1 }))).toBeNull();
    expect(getSessionIdFromToken("a.b.c")).toBeNull();
  });
});

describe("DTOs accept what the server really sends", () => {
  it("SafeUser from login keeps userProfile and drops nothing it needs", () => {
    expect(safeUserJson.userProfile.name).toBe("Ayşe Yılmaz");
    expect("name" in safeUserJson).toBe(false); // the old schema required these
    expect("image" in safeUserJson).toBe(false);
  });
});
