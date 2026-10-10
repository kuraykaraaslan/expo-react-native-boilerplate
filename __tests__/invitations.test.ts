import { MyTenantsResponseSchema } from "@/services/tenant/tenant.dto";
import { clearAllTokens, getToken } from "@/libs/secureStorage";
import { answerInvitation, invitationErrorKey, invitationIsGone, refreshTenantOverview } from "@/libs/invitations";
import { TenantClientService } from "@/services/tenant/tenant.service.client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { OTHER_TENANT_ID, TENANT_ID, meTenantsJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

const invitation = meTenantsJson.invitations[0];
const INVITATION_ID = invitation.invitationId;
const asInvitation = () => ({ ...invitation, memberRole: "ADMIN" as const, tenant: { ...invitation.tenant } }) as never;

beforeEach(async () => {
  await signIn();
  useTenantStore.setState({ pendingInvitations: [asInvitation()] });
});

describe("accept / decline by invitation id", () => {
  it("addresses the INVITING tenant but sends the bearer of the current tenant, and parses { tenantId, memberRole }", async () => {
    const seen = mockRoute("post", `/invitations/${INVITATION_ID}/accept`, { message: "Invitation accepted successfully", tenantId: OTHER_TENANT_ID, memberRole: "ADMIN" });

    const res = await TenantClientService.acceptInvitationById(OTHER_TENANT_ID, INVITATION_ID);

    expect(res).toMatchObject({ tenantId: OTHER_TENANT_ID, memberRole: "ADMIN" });
    expect(seen).toHaveLength(1);
    expect(seen[0].tenantId).toBe(OTHER_TENANT_ID); // URL: the invited organization
    expect(seen[0].body).toBeUndefined();
    const bearer = seen[0].headers.authorization;
    expect(bearer).toBe(`Bearer ${await getToken("accessToken", TENANT_ID)}`); // token: the tenant this device holds
    expect(await getToken("accessToken", OTHER_TENANT_ID)).toBeNull();
  });

  it("decline posts to .../decline and accepts the bare { message } answer", async () => {
    const seen = mockRoute("post", `/invitations/${INVITATION_ID}/decline`, { message: "Invitation declined successfully" });
    await TenantClientService.declineInvitationById(OTHER_TENANT_ID, INVITATION_ID);
    expect(seen[0]).toMatchObject({ method: "POST", tenantId: OTHER_TENANT_ID, path: `/invitations/${INVITATION_ID}/decline` });
  });

  it("a 'tenant unavailable' refusal about the invited tenant does not end the current session", async () => {
    mockRoute("post", `/invitations/${INVITATION_ID}/accept`, () => fail(404, { message: "Tenant is inactive", code: "TENANT_INACTIVE" }));

    await expect(TenantClientService.acceptInvitationById(OTHER_TENANT_ID, INVITATION_ID)).rejects.toBeDefined();

    expect(await getToken("accessToken", TENANT_ID)).not.toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe("answerInvitation", () => {
  it("accept: re-reads GET /auth/me/tenants and returns the new membership", async () => {
    mockRoute("post", `/invitations/${INVITATION_ID}/accept`, { message: "ok", tenantId: OTHER_TENANT_ID, memberRole: "ADMIN" });
    const me = mockRoute("get", "/auth/me/tenants", { ...meTenantsJson, invitations: [] });

    const result = await answerInvitation(asInvitation(), "accept");

    expect(me).toHaveLength(1);
    expect(me[0].tenantId).toBe(TENANT_ID);
    expect(result).toMatchObject({ action: "accept", stale: false, memberRole: "ADMIN" });
    expect(result.membership?.tenantId).toBe(OTHER_TENANT_ID);
    expect(useTenantStore.getState().pendingInvitations).toEqual([]);
  });

  it("decline: removes the invitation from the notice after the refresh", async () => {
    mockRoute("post", `/invitations/${INVITATION_ID}/decline`, { message: "ok" });
    mockRoute("get", "/auth/me/tenants", { ...meTenantsJson, invitations: [] });

    const result = await answerInvitation(asInvitation(), "decline");

    expect(result).toMatchObject({ action: "decline", stale: false });
    expect(useTenantStore.getState().pendingInvitations).toEqual([]);
  });

  it("still drops the invitation locally when the refresh fails after a successful answer", async () => {
    mockRoute("post", `/invitations/${INVITATION_ID}/decline`, { message: "ok" });
    mockRoute("get", "/auth/me/tenants", () => fail(500, { message: "boom" }));

    const result = await answerInvitation(asInvitation(), "decline");

    expect(result.stale).toBe(false);
    expect(useTenantStore.getState().pendingInvitations).toEqual([]);
  });

  it("writes nothing when the organization changed while the answer was in flight", async () => {
    mockRoute("post", `/invitations/${INVITATION_ID}/accept`, () => {
      useTenantStore.setState({ activeTenantId: "another-tenant" });
      return { body: { message: "ok", tenantId: OTHER_TENANT_ID, memberRole: "USER" } };
    });
    const me = mockRoute("get", "/auth/me/tenants", meTenantsJson);

    const result = await answerInvitation(asInvitation(), "accept");

    expect(result.stale).toBe(true);
    expect(me).toHaveLength(0);
    expect(useTenantStore.getState().pendingInvitations).toHaveLength(1);
  });

  it("writes nothing after a sign-out", async () => {
    mockRoute("post", `/invitations/${INVITATION_ID}/decline`, () => {
      useAuthStore.setState({ isAuthenticated: false });
      return { body: { message: "ok" } };
    });
    const me = mockRoute("get", "/auth/me/tenants", meTenantsJson);

    const result = await answerInvitation(asInvitation(), "decline");

    expect(result.stale).toBe(true);
    expect(me).toHaveLength(0);
  });

  it("an older overview response never overwrites a newer one", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const spy = jest.spyOn(TenantClientService, "getMyTenants");
    spy.mockImplementationOnce(async () => {
      await gate; // the slow, older read still carries the invitation
      return MyTenantsResponseSchema.parse(meTenantsJson);
    });
    spy.mockImplementationOnce(async () => MyTenantsResponseSchema.parse({ ...meTenantsJson, invitations: [] }));

    const older = refreshTenantOverview();
    const newer = refreshTenantOverview();
    await newer;
    release();
    await older;
    spy.mockRestore();

    expect(useTenantStore.getState().pendingInvitations).toEqual([]);
  });

  afterAll(() => clearAllTokens());
});

describe("error mapping", () => {
  const http = (status: number) => ({ response: { status, data: { message: "x" } } });

  it("maps the statuses this route is known to answer", () => {
    expect(invitationErrorKey(http(403))).toBe("MY_INVITATIONS.EMAIL_NOT_VERIFIED");
    expect(invitationErrorKey(http(404))).toBe("MY_INVITATIONS.NOT_FOUND");
    expect(invitationErrorKey(http(409))).toBe("MY_INVITATIONS.ALREADY_ANSWERED");
    expect(invitationErrorKey(http(410))).toBe("MY_INVITATIONS.EXPIRED");
    expect(invitationErrorKey(http(500))).toBeNull();
    expect(invitationErrorKey(new Error("offline"))).toBeNull();
  });

  it("flags answers that mean the invitation is gone", () => {
    expect([404, 409, 410].every((s) => invitationIsGone(http(s)))).toBe(true);
    expect(invitationIsGone(http(403))).toBe(false);
    expect(invitationIsGone(http(500))).toBe(false);
  });
});
