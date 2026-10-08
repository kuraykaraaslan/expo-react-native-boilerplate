import { configureTheme } from "kui-native/libs/theme";
import { applyCachedBranding, syncBranding } from "@/libs/theme/branding";
import { useAppliedBrand, useBrandingStore } from "@/stores/brandingStore";
import { OTHER_TENANT_ID, TENANT_ID } from "./fixtures";
import { fail, mockRoute } from "./_helpers";

jest.mock("kui-native/libs/theme", () => ({ configureTheme: jest.fn() }));
jest.mock("@/libs/theme/brand", () => ({ BASE_THEME: { light: { primary: "#2563eb", "text-secondary": "#4b5563" }, dark: {} } }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const configure = configureTheme as jest.Mock;
const lastPrimary = () => configure.mock.calls.at(-1)?.[0]?.light?.primary;

beforeEach(() => {
  configure.mockClear();
  useBrandingStore.setState({ byTenant: {} });
  useAppliedBrand.setState({ appliedTenantId: null });
});

describe("syncBranding", () => {
  it("applies a tenant's brand color the first time it is seen, over the base palette", async () => {
    const seen = mockRoute("get", "/settings/public", { success: true, settings: { brandPrimaryColor: "#7C3AED" }, tenant: { name: "Acme" } });
    await syncBranding(TENANT_ID);
    expect(seen[0].headers.authorization).toBeUndefined(); // a guest route: works before sign-in
    expect(lastPrimary()).toBe("#7c3aed");
    expect(configure.mock.calls.at(-1)?.[0].light["text-secondary"]).toBe("#4b5563"); // base kept
    expect(useBrandingStore.getState().byTenant).toEqual({ [TENANT_ID]: "#7c3aed" });
    expect(useAppliedBrand.getState().appliedTenantId).toBe(TENANT_ID);
  });

  it("caches a changed color for the tenant already on screen without repainting it", async () => {
    useBrandingStore.setState({ byTenant: { [TENANT_ID]: "#7c3aed" } });
    useAppliedBrand.setState({ appliedTenantId: TENANT_ID });
    mockRoute("get", "/settings/public", { settings: { brandPrimaryColor: "#0d9488" } });
    await syncBranding(TENANT_ID);
    expect(configure).not.toHaveBeenCalled();
    expect(useBrandingStore.getState().byTenant[TENANT_ID]).toBe("#0d9488"); // used at the next launch
  });

  it("stores null and keeps the base palette for a color that cannot be made accessible", async () => {
    mockRoute("get", "/settings/public", { settings: { brandPrimaryColor: "#ffff00" } }); // yellow: unreadable on white
    await syncBranding(TENANT_ID);
    expect(useBrandingStore.getState().byTenant[TENANT_ID]).toBeNull();
    expect(lastPrimary()).toBe("#2563eb");
  });

  it("treats a missing or junk color as none", async () => {
    mockRoute("get", "/settings/public", { settings: { brandPrimaryColor: "javascript:alert(1)" } });
    await syncBranding(TENANT_ID);
    expect(useBrandingStore.getState().byTenant[TENANT_ID]).toBeNull();
  });

  it("keeps the current palette when the request fails", async () => {
    mockRoute("get", "/settings/public", () => fail(500, { message: "boom" }));
    await syncBranding(TENANT_ID);
    expect(configure).not.toHaveBeenCalled();
    expect(useBrandingStore.getState().byTenant).toEqual({});
  });
});

describe("applyCachedBranding", () => {
  it("bumps the version on every apply, even for the same tenant, so the theme root re-renders", () => {
    const before = useAppliedBrand.getState().version;
    applyCachedBranding(TENANT_ID);
    applyCachedBranding(TENANT_ID);
    expect(useAppliedBrand.getState().version).toBe(before + 2);
  });

  it("applies the cached color of the tenant switched to, and the base for one never seen", () => {
    useBrandingStore.setState({ byTenant: { [TENANT_ID]: "#7c3aed" } });
    applyCachedBranding(TENANT_ID);
    expect(lastPrimary()).toBe("#7c3aed");
    applyCachedBranding(OTHER_TENANT_ID);
    expect(lastPrimary()).toBe("#2563eb");
    expect(useAppliedBrand.getState().appliedTenantId).toBe(OTHER_TENANT_ID);
  });
});
