import { refreshUnreadCount } from "@/libs/useUnreadPolling";
import { useNotificationStore } from "@/stores/notificationStore";
import { useTenantStore } from "@/stores/tenantStore";
import { OTHER_TENANT_ID, TENANT_ID, notificationsJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

beforeEach(async () => {
  await signIn(TENANT_ID);
  useNotificationStore.setState({ unreadCount: 0 });
});

describe("refreshUnreadCount", () => {
  it("counts the unread items of the active tenant's inbox", async () => {
    mockRoute("get", "/auth/me/notifications", notificationsJson);
    await refreshUnreadCount();
    expect(useNotificationStore.getState().unreadCount).toBe(1); // fixture: one unread, one read
  });

  it("keeps the last count when the request fails", async () => {
    useNotificationStore.setState({ unreadCount: 4 });
    mockRoute("get", "/auth/me/notifications", () => fail(500, { message: "boom" }));
    await refreshUnreadCount();
    expect(useNotificationStore.getState().unreadCount).toBe(4);
  });

  it("drops an answer that arrives after the user switched organization", async () => {
    mockRoute("get", "/auth/me/notifications", () => {
      useTenantStore.setState({ activeTenantId: OTHER_TENANT_ID }); // switch while the request is in flight
      return { body: notificationsJson };
    });
    await refreshUnreadCount();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
