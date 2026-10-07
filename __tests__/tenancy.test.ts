import { axiosInstance } from "@/libs/axios";
import { logout } from "@/libs/logout";
import { getToken, setTokens } from "@/libs/secureStorage";
import { activateSignedInTenant, switchToTenant } from "@/libs/tenantSwitch";
import { TenantMembershipSchema } from "@/services/tenant/tenant.dto";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { isSelectable, unavailableReason } from "@/utils/tenant";
import { MEMBER_ID, OTHER_TENANT_ID, TENANT_ID, USER_ID, makeJwt, meTenantsJson, sessionJson, tenantJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

const membership = (tenantId: string, over: Record<string, unknown> = {}) =>
  TenantMembershipSchema.parse({
    tenantMemberId: `m-${tenantId}`,
    memberRole: "USER",
    memberStatus: "ACTIVE",
    tenant: { ...tenantJson, tenantId, name: `Org ${tenantId.slice(-2)}` },
    ...over,
  });

const sessionFor = (tenantId: string, memberRole: string) => ({
  ...sessionJson,
  tenant: { ...sessionJson.tenant, tenantId },
  tenantMember: { ...sessionJson.tenantMember, memberRole },
});

async function holdSessionFor(tenantId: string) {
  await setTokens(tenantId, {
    accessToken: makeJwt({ userId: USER_ID, userSessionId: `sess-${tenantId}`, tenantId }),
    refreshToken: `refresh-${tenantId}`,
  });
}

beforeEach(async () => {
  await signIn(TENANT_ID);
  useAuthStore.setState({ isAuthenticated: true, otpRequired: false, mustChangePassword: false });
  useTenantStore.setState({ needsTenantSelection: false, pendingInvitations: [], delegatedTenants: [] });
});

describe("switchToTenant", () => {
  it("switches without a password when a live pair exists, and takes the role from the server", async () => {
    await holdSessionFor(OTHER_TENANT_ID);
    const seen = mockRoute("get", "/auth/session", sessionFor(OTHER_TENANT_ID, "ADMIN"));

    const outcome = await switchToTenant(membership(OTHER_TENANT_ID, { memberRole: "USER" }));

    expect(outcome).toBe("switched");
    expect(seen[0].tenantId).toBe(OTHER_TENANT_ID); // verified against the target tenant, with its own token
    expect(seen[0].headers.authorization).toContain((await getToken("accessToken", OTHER_TENANT_ID)) as string);
    expect(useTenantStore.getState().activeTenantId).toBe(OTHER_TENANT_ID);
    expect(useTenantStore.getState().selectedTenantMembership?.memberRole).toBe("ADMIN"); // not the cached USER
  });

  it("asks for a login when this device has no pair for that tenant, and changes nothing", async () => {
    const outcome = await switchToTenant(membership(OTHER_TENANT_ID));
    expect(outcome).toBe("login-required");
    expect(useTenantStore.getState().activeTenantId).toBe(TENANT_ID);
  });

  it("a dead pair is cleared and reported as login-required without ending the current tenant's session", async () => {
    await holdSessionFor(OTHER_TENANT_ID);
    mockRoute("get", "/auth/session", () => fail(401, { message: "SESSION_EXPIRED" }));

    const outcome = await switchToTenant(membership(OTHER_TENANT_ID));

    expect(outcome).toBe("login-required");
    expect(await getToken("accessToken", OTHER_TENANT_ID)).toBeNull();
    expect(await getToken("accessToken", TENANT_ID)).not.toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useTenantStore.getState().activeTenantId).toBe(TENANT_ID);
  });

  it("an outage is an error for the caller, not a login prompt", async () => {
    await holdSessionFor(OTHER_TENANT_ID);
    mockRoute("get", "/auth/session", () => fail(503, { message: "down" }));
    await expect(switchToTenant(membership(OTHER_TENANT_ID))).rejects.toBeTruthy();
    expect(await getToken("accessToken", OTHER_TENANT_ID)).not.toBeNull();
  });
});

describe("activateSignedInTenant", () => {
  it("selects the new tenant with the role from the login reply", async () => {
    mockRoute("get", "/auth/me/tenants", {
      ...meTenantsJson,
      tenants: [{ tenantMemberId: MEMBER_ID, memberRole: "USER", memberStatus: "ACTIVE", tenant: { ...tenantJson, tenantId: OTHER_TENANT_ID, name: "Fresh Org" } }],
    });
    await activateSignedInTenant(OTHER_TENANT_ID, "OWNER");
    const state = useTenantStore.getState();
    expect(state.activeTenantId).toBe(OTHER_TENANT_ID);
    expect(state.selectedTenantMembership).toMatchObject({ tenantId: OTHER_TENANT_ID, memberRole: "OWNER" });
    expect(state.needsTenantSelection).toBe(false);
  });

  it("still activates the tenant when the list cannot be loaded", async () => {
    mockRoute("get", "/auth/me/tenants", () => fail(500, { message: "x" }));
    await activateSignedInTenant(OTHER_TENANT_ID, "OWNER");
    expect(useTenantStore.getState().activeTenantId).toBe(OTHER_TENANT_ID);
    expect(useTenantStore.getState().selectedTenantMembership).toBeNull();
  });
});

describe("losing the active organization", () => {
  it("falls to another signed-in organization and asks for a pick instead of signing out", async () => {
    await holdSessionFor(OTHER_TENANT_ID);
    mockRoute("get", "/auth/me/sessions", () => fail(403, { message: "Tenant membership is suspended" }));

    await expect(axiosInstance.get("/auth/me/sessions")).rejects.toBeTruthy();

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useTenantStore.getState()).toMatchObject({ activeTenantId: OTHER_TENANT_ID, needsTenantSelection: true, selectedTenantMembership: null });
    expect(await getToken("accessToken", TENANT_ID)).toBeNull(); // the lost tenant's pair is gone
    expect(await getToken("accessToken", OTHER_TENANT_ID)).not.toBeNull();
  });

  it("signs out when there is no other organization to fall back to", async () => {
    mockRoute("get", "/auth/me/sessions", () => fail(403, { message: "Tenant membership is suspended" }));
    await expect(axiosInstance.get("/auth/me/sessions")).rejects.toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useTenantStore.getState().activeTenantId).toBeNull();
  });
});

describe("sign-out leaves nothing behind", () => {
  it("clears the pair of EVERY organization the device holds", async () => {
    await holdSessionFor(OTHER_TENANT_ID);
    mockRoute("delete", "/auth/me/sessions/:id", { success: true });

    await logout();

    expect(await getToken("accessToken", TENANT_ID)).toBeNull();
    expect(await getToken("refreshToken", TENANT_ID)).toBeNull();
    expect(await getToken("accessToken", OTHER_TENANT_ID)).toBeNull();
    expect(await getToken("refreshToken", OTHER_TENANT_ID)).toBeNull();
    expect(useTenantStore.getState().knownTenantIds).toEqual([]);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("flush forgets the memberships, invitations and pending selection", () => {
    useTenantStore.setState({ memberships: [membership(TENANT_ID)], pendingInvitations: [{} as never], needsTenantSelection: true });
    useTenantStore.getState().flush();
    expect(useTenantStore.getState()).toMatchObject({ memberships: [], pendingInvitations: [], needsTenantSelection: false, activeTenantId: null });
  });
});

describe("selectable organizations", () => {
  it("needs both an active membership and an active organization", () => {
    expect(isSelectable(membership(TENANT_ID))).toBe(true);
    expect(isSelectable(membership(TENANT_ID, { memberStatus: "SUSPENDED" }))).toBe(false);
    expect(isSelectable(membership(TENANT_ID, { tenant: { ...tenantJson, tenantStatus: "INACTIVE" } }))).toBe(false);
  });

  it("explains the membership first, then the organization", () => {
    expect(unavailableReason(membership(TENANT_ID, { memberStatus: "PENDING" }))).toEqual({ kind: "membership", status: "PENDING" });
    expect(unavailableReason(membership(TENANT_ID, { tenant: { ...tenantJson, tenantStatus: "SUSPENDED" } }))).toEqual({ kind: "tenant", status: "SUSPENDED" });
    expect(unavailableReason(membership(TENANT_ID))).toBeNull();
  });
});
