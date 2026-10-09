import { isPlanGateError, normalizeApiError } from "@/libs/apiError";
import { serverLocaleFor, SERVER_LOCALE } from "@/libs/serverLocale";
import { SUPPORTED_LOCALES } from "@/libs/i18n";
import { refreshFlags } from "@/libs/useFeatureFlag";
import { useAppStore } from "@/stores/appStore";
import { useFlagStore } from "@/stores/flagStore";
import { useTenantStore } from "@/stores/tenantStore";
import { OTHER_TENANT_ID, TENANT_ID } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

beforeEach(async () => {
  await signIn(TENANT_ID);
  useFlagStore.setState({ byTenant: {} });
  useAppStore.setState({ locale: "en" });
});

describe("server locale", () => {
  it("maps every client language to a full tag", () => {
    expect(Object.keys(SERVER_LOCALE).sort((a, b) => a.localeCompare(b))).toEqual([...SUPPORTED_LOCALES].sort((a, b) => a.localeCompare(b)));
    expect(serverLocaleFor("tr")).toBe("tr-TR");
  });

  it("falls back to English for unknown input", () => {
    expect(serverLocaleFor("xx")).toBe("en-US");
    expect(serverLocaleFor(undefined)).toBe("en-US");
  });

  it("is sent as Accept-Language on every request and follows the picker", async () => {
    const seen = mockRoute("post", "/feature-flags/evaluate", { flags: {} });
    useAppStore.setState({ locale: "de" });
    await refreshFlags();
    useAppStore.setState({ locale: "tr" });
    await refreshFlags();
    expect(seen.map((r) => r.headers["accept-language"])).toEqual(["de-DE", "tr-TR"]);
  });
});

describe("feature flags", () => {
  it("caches the evaluation for the active tenant", async () => {
    mockRoute("post", "/feature-flags/evaluate", { flags: { beta_chat: true, new_home: false } });
    await refreshFlags();
    expect(useFlagStore.getState().byTenant[TENANT_ID]).toEqual({ beta_chat: true, new_home: false });
  });

  it("keeps the cached flags when evaluation fails", async () => {
    useFlagStore.setState({ byTenant: { [TENANT_ID]: { beta_chat: true } } });
    mockRoute("post", "/feature-flags/evaluate", () => fail(500, { message: "boom" }));
    await refreshFlags();
    expect(useFlagStore.getState().byTenant[TENANT_ID]).toEqual({ beta_chat: true });
  });

  it("keeps everything off when nothing was ever cached", async () => {
    mockRoute("post", "/feature-flags/evaluate", () => fail(500, { message: "boom" }));
    await refreshFlags();
    expect(useFlagStore.getState().byTenant[TENANT_ID]?.beta_chat).toBeUndefined();
  });

  it("drops an answer that arrives after the user switched organization", async () => {
    mockRoute("post", "/feature-flags/evaluate", () => {
      useTenantStore.setState({ activeTenantId: OTHER_TENANT_ID });
      return { body: { flags: { beta_chat: true } } };
    });
    await refreshFlags();
    expect(useFlagStore.getState().byTenant[TENANT_ID]).toBeUndefined();
  });
});

describe("plan gate errors", () => {
  const gate = (code: string) => ({ isAxiosError: true, response: { status: 403, data: { message: "This feature is not available on your current plan", code }, headers: {} } });

  it("turns FEATURE_NOT_AVAILABLE into the upgrade message", () => {
    const e = normalizeApiError(gate("FEATURE_NOT_AVAILABLE"));
    expect(e.planGate).toBe(true);
    expect(e.message).toBe("Your current plan doesn't include this. Upgrade your plan to continue.");
  });

  it("covers quota and seat limits, and ignores other 403s", () => {
    expect(isPlanGateError(gate("QUOTA_EXCEEDED"))).toBe(true);
    expect(isPlanGateError(gate("SEAT_LIMIT_REACHED"))).toBe(true);
    expect(isPlanGateError(gate("FORBIDDEN"))).toBe(false);
  });
});
