import { invitationRoute, isSsoCallback, mapIncomingPath, parseInvitationLink, pathOf } from "@/libs/deepLinks";

const TENANT = "3f2a1c9e-8b7d-4e6f-9a10-1234567890ab";

describe("pathOf", () => {
  it("strips origin, query and fragment and normalises slashes", () => {
    expect(pathOf("https://app.example.com/auth/invitation/accept?token=secret#x")).toBe("/auth/invitation/accept");
    expect(pathOf("/auth/invitation/accept/?token=secret")).toBe("/auth/invitation/accept");
    expect(pathOf("expoboilerplate://auth/callback?rawAccessToken=a")).toBe("/auth/callback");
    expect(pathOf("expoboilerplate:///auth/callback")).toBe("/auth/callback");
    expect(pathOf("https://app.example.com")).toBe("/");
  });
});

describe("invitation links", () => {
  it.each([
    [`https://app.example.com/auth/invitation/accept?token=abc`, { tenantId: null, action: "accept" }],
    [`https://app.example.com/auth/invitation/decline?token=abc`, { tenantId: null, action: "decline" }],
    [`https://app.example.com/t/${TENANT}/auth/invitation/accept?token=abc`, { tenantId: TENANT, action: "accept" }],
    [`https://app.example.com/tenant/${TENANT.toUpperCase()}/auth/invitation/decline?token=abc`, { tenantId: TENANT, action: "decline" }],
    [`/auth/invitation/accept?token=abc`, { tenantId: null, action: "accept" }],
  ])("recognises %s", (url, expected) => {
    expect(parseInvitationLink(url)).toEqual(expected);
  });

  it.each([
    "https://app.example.com/auth/invitation/other?token=abc",
    "https://app.example.com/t/not-a-uuid/auth/invitation/accept",
    "https://app.example.com/auth/login",
    "/settings/profile",
  ])("ignores %s", (url) => {
    expect(parseInvitationLink(url)).toBeNull();
  });

  it("routes to the invitation screen without carrying the token", () => {
    const route = mapIncomingPath(`https://app.example.com/t/${TENANT}/auth/invitation/accept?token=top-secret`);
    expect(route).toBe(`/invitation?action=accept&tenantId=${TENANT}`);
    expect(route).not.toContain("top-secret");
    expect(invitationRoute({ tenantId: null, action: "decline" })).toBe("/invitation?action=decline");
  });
});

describe("SSO return", () => {
  it("recognises the callback in both URL spellings", () => {
    expect(isSsoCallback("expoboilerplate://auth/callback?rawAccessToken=a&state=s")).toBe(true);
    expect(isSsoCallback("expoboilerplate:///auth/callback?state=s")).toBe(true);
    expect(isSsoCallback("/auth/login")).toBe(false);
  });

  it("keeps the router at the root so tokens never reach +not-found or router state", () => {
    expect(mapIncomingPath("expoboilerplate://auth/callback?rawAccessToken=secret&rawRefreshToken=secret2&state=s")).toBe("/");
  });
});

it("leaves every other path to Expo Router untouched", () => {
  expect(mapIncomingPath("/settings/profile?x=1")).toBe("/settings/profile?x=1");
  expect(mapIncomingPath("expoboilerplate://reset-password?token=t")).toBe("expoboilerplate://reset-password?token=t");
});
