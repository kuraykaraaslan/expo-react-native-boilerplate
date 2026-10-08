import * as WebBrowser from "expo-web-browser";
import { SSO_PROVIDER_META } from "@/components/auth/ssoProviders";
import { getToken } from "@/libs/secureStorage";
import { SSO_REDIRECT_TIMEOUT_MS, signInWithProvider, tenantFromState } from "@/libs/ssoSession";
import { SSOProviderEnum } from "@/services/auth/sso.dto";
import { SSOClientService } from "@/services/auth/sso.service.client";
import { useAuthStore } from "@/stores/authStore";
import { useSSOStore } from "@/stores/ssoStore";
import { useTenantStore } from "@/stores/tenantStore";
import { OTHER_TENANT_ID, TENANT_ID, makeJwt, sessionJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("expo-linking", () => ({
  createURL: (path: string) => `expoboilerplate:/${path}`,
  parse: (url: string) => ({ queryParams: Object.fromEntries(new URL(url).searchParams) }),
}));
jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn(), dismissAuthSession: jest.fn() }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

const open = WebBrowser.openAuthSessionAsync as jest.Mock;
const STATE = `${OTHER_TENANT_ID}.1111-2222`;
const callback = (params: Record<string, string>) => ({ type: "success", url: `expoboilerplate://auth/callback?${new URLSearchParams(params)}` });
const deviceAccess = makeJwt({ userId: "u1", userSessionId: "s1", tenantId: OTHER_TENANT_ID });

beforeEach(async () => {
  open.mockReset();
  (WebBrowser.dismissAuthSession as jest.Mock).mockReset();
  await signIn(TENANT_ID);
  useAuthStore.setState({ isAuthenticated: false, user: null });
  useSSOStore.setState({ pendingState: null });
  mockRoute("get", "/auth/sso/google", { url: "https://accounts.example.com/auth", state: STATE });
});

describe("providers", () => {
  it("lists what the tenant allows and drops providers this app does not know", async () => {
    mockRoute("get", "/auth/sso", { providers: ["google", "github", "some-future-idp"] });
    await expect(SSOClientService.getProviders()).resolves.toEqual(["google", "github"]);
  });

  it("has an icon entry for every provider the app knows", () => {
    for (const provider of SSOProviderEnum.options) expect(SSO_PROVIDER_META[provider]).toBeDefined();
  });

  it("reads the linked accounts without needing every column", async () => {
    mockRoute("get", "/auth/me/social-accounts", {
      accounts: [{ userSocialAccountId: "a1", provider: "google", displayName: "Google", kind: "oauth", group: "social", tokenExpired: true, extra: 1 }],
    });
    const accounts = await SSOClientService.getSocialAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ provider: "google", tokenExpired: true });
  });
});

describe("browser flow", () => {
  it("tells the server where to hand the tokens back, and opens the provider URL", async () => {
    const seen = mockRoute("get", "/auth/sso/google", { url: "https://accounts.example.com/auth", state: STATE });
    open.mockResolvedValue({ type: "cancel" });
    await signInWithProvider("google");
    expect(seen[0].query.redirect_uri).toBe("expoboilerplate://auth/callback");
    expect(open).toHaveBeenCalledWith("https://accounts.example.com/auth", "expoboilerplate://auth/callback");
  });

  it("closing the browser is silent: cancelled, nothing stored, the pending state is dropped", async () => {
    open.mockResolvedValue({ type: "dismiss" });
    await expect(signInWithProvider("google")).resolves.toBe("cancelled");
    expect(useSSOStore.getState().pendingState).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("rejects a callback whose state is not the one we sent", async () => {
    open.mockResolvedValue(callback({ state: "other.state", rawAccessToken: deviceAccess, rawRefreshToken: "r" }));
    await expect(signInWithProvider("google")).resolves.toBe("state-mismatch");
    expect(await getToken("accessToken", OTHER_TENANT_ID)).toBeNull();
  });

  it("keeps the state until the callback arrives, and uses it once", async () => {
    open.mockImplementation(async () => {
      expect(useSSOStore.getState().pendingState).toBe(STATE);
      return { type: "cancel" };
    });
    await signInWithProvider("google");
    expect(useSSOStore.getState().pendingState).toBeNull();
  });

  it("K4: a web-audience token (session 401) is refused and NOT written", async () => {
    mockRoute("get", "/auth/session", () => fail(401, { message: "USER_NOT_AUTHENTICATED" }));
    open.mockResolvedValue(callback({ state: STATE, rawAccessToken: "web-audience-token", rawRefreshToken: "web-refresh" }));

    await expect(signInWithProvider("google")).resolves.toBe("unavailable");

    expect(await getToken("accessToken", OTHER_TENANT_ID)).toBeNull();
    expect(await getToken("refreshToken", OTHER_TENANT_ID)).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useTenantStore.getState().activeTenantId).toBe(TENANT_ID);
  });

  it("a callback without device tokens is unavailable, not an error", async () => {
    open.mockResolvedValue(callback({ state: STATE }));
    await expect(signInWithProvider("google")).resolves.toBe("unavailable");
  });

  it("signs in once the server hands out a token the bearer path accepts", async () => {
    const seen = mockRoute("get", "/auth/session", { ...sessionJson, tenant: { ...sessionJson.tenant, tenantId: OTHER_TENANT_ID } });
    open.mockResolvedValue(callback({ state: STATE, rawAccessToken: deviceAccess, rawRefreshToken: "device-refresh" }));

    await expect(signInWithProvider("google")).resolves.toBe("signed-in");

    expect(seen[0].tenantId).toBe(OTHER_TENANT_ID); // taken from the state, before anything is stored
    expect(seen[0].headers.authorization).toBe(`Bearer ${deviceAccess}`);
    expect(await getToken("accessToken", OTHER_TENANT_ID)).toBe(deviceAccess);
    expect(await getToken("refreshToken", OTHER_TENANT_ID)).toBe("device-refresh");
    expect(useTenantStore.getState().activeTenantId).toBe(OTHER_TENANT_ID);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("gives up when the browser never redirects back to the app", async () => {
    jest.useFakeTimers();
    try {
      open.mockReturnValue(new Promise(() => undefined)); // stuck on a web page
      const pending = signInWithProvider("google");
      await jest.advanceTimersByTimeAsync(0); // let the auth-url request settle
      await jest.advanceTimersByTimeAsync(SSO_REDIRECT_TIMEOUT_MS);
      await expect(pending).resolves.toBe("unavailable");
      expect(WebBrowser.dismissAuthSession).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("state format", () => {
  it("reads the tenant out of {tenantId}.{uuid}", () => {
    expect(tenantFromState(STATE)).toBe(OTHER_TENANT_ID);
    expect(tenantFromState("no-dot")).toBeNull();
    expect(tenantFromState(".leading")).toBeNull();
  });
});
