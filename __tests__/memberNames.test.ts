import { loadMemberNames } from "@/libs/memberNames";
import { useMessagingStore } from "@/stores/messagingStore";
import { TENANT_ID } from "./fixtures";
import { mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const member = (n: number) => ({ tenantMemberId: `m${n}`, tenantId: TENANT_ID, userId: `u${n}`, user: { userId: `u${n}`, email: `u${n}@example.com` } });

beforeEach(async () => {
  await signIn(TENANT_ID);
  useMessagingStore.getState().reset();
});

it("pages through the whole member list until total is reached", async () => {
  const pages = mockRoute("get", "/members", (call: number) => ({
    body: { members: call === 1 ? Array.from({ length: 100 }, (_, i) => member(i)) : [member(100), member(101)], total: 102, page: call - 1, pageSize: 100 },
  }));
  const members = await loadMemberNames();
  expect(members).toHaveLength(102);
  expect(pages.map((p) => p.query.page)).toEqual(["0", "1"]);
  expect(useMessagingStore.getState().names.u101).toBe("u101@example.com");
});
