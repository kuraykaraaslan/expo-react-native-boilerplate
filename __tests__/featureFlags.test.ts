import { refreshFlags } from "@/libs/featureFlags";
import { FeatureFlagsClientService } from "@/modules/feature_flags/feature_flags.service.client";
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
});

describe("FeatureFlagsClientService.evaluateAll", () => {
  it("posts an empty body (the caller is the subject) and returns the flag map", async () => {
    const seen = mockRoute("post", "/feature-flags/evaluate", { flags: { "new-dashboard": true, "beta-chat": false } });
    expect(await FeatureFlagsClientService.evaluateAll()).toEqual({ "new-dashboard": true, "beta-chat": false });
    expect(seen[0].body).toEqual({});
  });

  it("passes targeting attributes when given, and treats a missing map as no flags", async () => {
    const seen = mockRoute("post", "/feature-flags/evaluate", {});
    expect(await FeatureFlagsClientService.evaluateAll({ plan: "pro", beta: true })).toEqual({});
    expect(seen[0].body).toEqual({ attributes: { plan: "pro", beta: true } });
  });
});

describe("refreshFlags", () => {
  it("caches the evaluation under the active tenant", async () => {
    mockRoute("post", "/feature-flags/evaluate", { flags: { a: true } });
    await refreshFlags();
    expect(useFlagStore.getState().byTenant).toEqual({ [TENANT_ID]: { a: true } });
  });

  it("keeps the last cached values when the request fails", async () => {
    useFlagStore.setState({ byTenant: { [TENANT_ID]: { a: true } } });
    mockRoute("post", "/feature-flags/evaluate", () => fail(500, { message: "boom" }));
    await refreshFlags();
    expect(useFlagStore.getState().byTenant[TENANT_ID]).toEqual({ a: true });
  });

  it("drops an answer that arrives after the user switched organization", async () => {
    mockRoute("post", "/feature-flags/evaluate", () => {
      useTenantStore.setState({ activeTenantId: OTHER_TENANT_ID });
      return { body: { flags: { a: true } } };
    });
    await refreshFlags();
    expect(useFlagStore.getState().byTenant).toEqual({});
  });
});
