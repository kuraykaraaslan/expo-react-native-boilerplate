import { SSOClientService } from "@/services/auth/sso.service.client";
import { TenantClientService } from "@/services/tenant/tenant.service.client";
import { MEMBER_ID, OTHER_TENANT_ID, TENANT_ID, invitationsJson, meTenantsJson, membersJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

beforeEach(() => signIn());

describe("getMyTenants", () => {
  it("lifts tenantId onto each membership (the server sends none), keeps `invitations`, defaults delegatedTenants", async () => {
    mockRoute("get", "/auth/me/tenants", meTenantsJson);

    const res = await TenantClientService.getMyTenants();

    expect(res.tenants).toHaveLength(2);
    expect(res.tenants[0]).toMatchObject({ tenantMemberId: MEMBER_ID, tenantId: TENANT_ID, memberRole: "OWNER" });
    expect(res.tenants[1].tenantId).toBe(OTHER_TENANT_ID);
    expect(res.tenants[1].tenant.tenantStatus).toBe("INACTIVE"); // not in the old status enum
    expect(res.delegatedTenants).toEqual([]);
    expect(res.invitations).toHaveLength(1);
    expect(res.invitations[0]).toMatchObject({ tenantId: OTHER_TENANT_ID, status: "PENDING" });
    expect(res.invitations[0].email).toBeUndefined(); // this shape has no email
  });

  it("copes with the keys a lean server answer leaves out", async () => {
    mockRoute("get", "/auth/me/tenants", { success: true, tenants: [] });
    const res = await TenantClientService.getMyTenants();
    expect(res).toMatchObject({ tenants: [], delegatedTenants: [], invitations: [] });
  });
});

describe("createTenant", () => {
  it("posts to /tenants/create and parses the 201 body", async () => {
    const seen = mockRoute("post", "/tenants/create", () => ({
      body: { success: true, tenant: { tenantId: TENANT_ID, name: "New Org", description: null, tenantStatus: "ACTIVE" }, message: "Organization created successfully" },
      init: { status: 201 },
    }));

    const res = await TenantClientService.createTenant({ name: "  New Org  " });

    expect(seen[0].path).toBe("/tenants/create");
    expect(seen[0].body).toEqual({ name: "New Org", region: "TR" }); // trimmed, region defaulted
    expect(res.tenant.name).toBe("New Org");
  });

  it("keeps the server's 2-character minimum (the route rejects shorter names)", async () => {
    const seen = mockRoute("post", "/tenants/create", {});
    await expect(TenantClientService.createTenant({ name: " a " })).rejects.toBeDefined();
    expect(seen).toHaveLength(0);
  });
});

describe("own organization profile", () => {
  it("get / update use /tenant/profile and return the bare { name, description }", async () => {
    mockRoute("get", "/tenant/profile", { name: "Acme Studio", description: null });
    const put = mockRoute("put", "/tenant/profile", { name: "Acme", description: "x", message: "Profile updated successfully" });

    expect(await TenantClientService.getTenantProfile()).toMatchObject({ name: "Acme Studio", description: null });
    const updated = await TenantClientService.updateTenantProfile({ name: "Acme", description: "x" });
    expect(put[0].body).toEqual({ name: "Acme", description: "x" });
    expect(updated.name).toBe("Acme");
  });
});

describe("members", () => {
  it("getMembers addresses the given tenant, passes the filters and parses SafeUser-based members", async () => {
    const seen = mockRoute("get", "/members", membersJson);

    const res = await TenantClientService.getMembers(OTHER_TENANT_ID, { page: 0, pageSize: 25, search: "ay", memberRole: "ADMIN" });

    expect(seen[0].tenantId).toBe(OTHER_TENANT_ID);
    expect(seen[0].query).toEqual({ page: "0", pageSize: "25", search: "ay", memberRole: "ADMIN" });
    expect(res.members).toHaveLength(2);
    expect(res.members[0].user?.userProfile?.name).toBe("Ayşe Yılmaz");
    expect(res.members[1]).toMatchObject({ memberStatus: "SUSPENDED", roleKeys: ["support"] });
    expect(res.page).toBe(0);
  });

  it("getMember unwraps `member`", async () => {
    mockRoute("get", "/members/:id", { member: membersJson.members[0] });
    expect((await TenantClientService.getMember(TENANT_ID, MEMBER_ID)).userId).toBe(membersJson.members[0].userId);
  });

  it("updateMember: 200 returns the member", async () => {
    const seen = mockRoute("put", "/members/:id", { message: "Member updated successfully", member: { ...membersJson.members[1], memberRole: "ADMIN" } });
    const res = await TenantClientService.updateMember(TENANT_ID, MEMBER_ID, { memberRole: "ADMIN", memberStatus: "ACTIVE" });
    expect(seen[0].body).toEqual({ memberRole: "ADMIN", memberStatus: "ACTIVE" });
    expect(res.member?.memberRole).toBe("ADMIN");
    expect(res.pendingApproval).toBeUndefined();
  });

  it("updateMember: 202 pendingApproval has no member and must not throw", async () => {
    mockRoute("put", "/members/:id", () => ({ body: { message: "Role change submitted for approval", pendingApproval: true }, init: { status: 202 } }));
    const res = await TenantClientService.updateMember(TENANT_ID, MEMBER_ID, { memberRole: "ADMIN" });
    expect(res.member).toBeUndefined();
    expect(res.pendingApproval).toBe(true);
  });

  it("removeMember deletes by id", async () => {
    const seen = mockRoute("delete", "/members/:id", { message: "Member removed successfully" });
    await TenantClientService.removeMember(TENANT_ID, MEMBER_ID);
    expect(seen[0].path).toBe(`/members/${MEMBER_ID}`);
  });

  it("a 403 'cannot assign a role equal to your own' is a plain error and keeps the session", async () => {
    mockRoute("put", "/members/:id", () => fail(403, { message: "You cannot assign a role equal to or higher than your own" }));
    await expect(TenantClientService.updateMember(TENANT_ID, MEMBER_ID, { memberRole: "OWNER" })).rejects.toBeDefined();
  });
});

describe("invitations", () => {
  it("getInvitations parses SafeTenantInvitation (page is 1-based)", async () => {
    const seen = mockRoute("get", "/invitations", invitationsJson);
    const res = await TenantClientService.getInvitations(TENANT_ID, { status: "PENDING" });
    expect(seen[0].query).toEqual({ status: "PENDING" });
    expect(res.invitations[0]).toMatchObject({ email: "zeynep@example.com", status: "PENDING", memberRole: "USER" });
    expect(res.page).toBe(1);
  });

  it("sendInvitation defaults the role to USER", async () => {
    const seen = mockRoute("post", "/invitations", () => ({ body: { message: "Invitation sent successfully", invitation: invitationsJson.invitations[0] }, init: { status: 201 } }));
    await TenantClientService.sendInvitation(TENANT_ID, { email: "zeynep@example.com" });
    expect(seen[0].body).toEqual({ email: "zeynep@example.com", memberRole: "USER" });
  });

  it("resend and remind post without a body and return the invitation", async () => {
    const inv = invitationsJson.invitations[0];
    const resend = mockRoute("post", "/invitations/:id/resend", { message: "Invitation sent successfully", invitation: inv });
    const remind = mockRoute("post", "/invitations/:id/remind", { message: "Reminder sent", invitation: inv });
    const a = await TenantClientService.resendInvitation(TENANT_ID, inv.invitationId);
    const b = await TenantClientService.remindInvitation(TENANT_ID, inv.invitationId);
    expect(resend[0].path).toBe(`/invitations/${inv.invitationId}/resend`);
    expect(resend[0].body).toBeUndefined();
    expect(remind[0].path).toBe(`/invitations/${inv.invitationId}/remind`);
    expect(a).toMatchObject({ email: "zeynep@example.com", status: "PENDING" });
    expect(b.invitationId).toBe(inv.invitationId);
  });

  it("revoke, accept and decline", async () => {
    const del = mockRoute("delete", "/invitations/:id", { message: "Invitation revoked successfully" });
    const accept = mockRoute("post", "/invitations/accept", { message: "Invitation accepted successfully" });
    const decline = mockRoute("post", "/invitations/decline", { message: "Invitation declined" });
    await TenantClientService.revokeInvitation(TENANT_ID, "i-1");
    await TenantClientService.acceptInvitation(TENANT_ID, "tok-1");
    await TenantClientService.declineInvitation(TENANT_ID, "tok-2");
    expect(del[0].path).toBe("/invitations/i-1");
    expect(accept[0].body).toEqual({ token: "tok-1" });
    expect(decline[0].body).toEqual({ token: "tok-2" });
  });
});

describe("settings", () => {
  it("get and update return the string map", async () => {
    mockRoute("get", "/settings", { success: true, settings: { allowSelfRegistration: "true" } });
    const post = mockRoute("post", "/settings", { success: true, settings: { defaultMemberRole: "USER" } });
    expect(await TenantClientService.getTenantSettings(TENANT_ID)).toEqual({ allowSelfRegistration: "true" });
    expect(await TenantClientService.updateTenantSettings(TENANT_ID, { defaultMemberRole: "USER" })).toEqual({ defaultMemberRole: "USER" });
    expect(post[0].body).toEqual({ settings: { defaultMemberRole: "USER" } });
  });
});

describe("SSO", () => {
  it("getProviders keeps the known providers and drops ones this app version does not know", async () => {
    const seen = mockRoute("get", "/auth/sso", { providers: ["google", "github", "some-new-idp"] });
    expect(await SSOClientService.getProviders()).toEqual(["google", "github"]);
    expect(seen[0].headers.authorization).toBeUndefined(); // public
  });

  it("getAuthUrl returns the provider URL and the {tenantId}.{uuid} state", async () => {
    const seen = mockRoute("get", "/auth/sso/:provider", { url: "https://accounts.google.com/o/oauth2/v2/auth?x=1", state: `${TENANT_ID}.abc` });
    const res = await SSOClientService.getAuthUrl("google");
    expect(seen[0].path).toBe("/auth/sso/google");
    expect(res.state.startsWith(TENANT_ID)).toBe(true);
  });

  it("an unconfigured provider is a 400 { message }", async () => {
    mockRoute("get", "/auth/sso/:provider", () => fail(400, { message: "Invalid provider" }));
    await expect(SSOClientService.getAuthUrl("apple")).rejects.toBeDefined();
  });
});
