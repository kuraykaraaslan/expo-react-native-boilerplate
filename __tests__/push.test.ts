import { http, HttpResponse } from "msw";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { env } from "@/libs/env";
import { logout } from "@/libs/logout";
import {
  UNREGISTER_CAP_MS,
  getPushPermission,
  pushTargetFor,
  registerPushForAllTenants,
  registerPushForTenant,
  requestPushPermission,
  resolveProjectId,
  unregisterAllPush,
} from "@/libs/push";
import { foregroundBehavior, openFromResponse, usePushNotifications } from "@/libs/usePushNotifications";
import { setOpenConversation } from "@/libs/realtime";
import { getToken, setTokens } from "@/libs/secureStorage";
import { PushClientService } from "@/services/user/push.service.client";
import { useAuthStore } from "@/stores/authStore";
import { usePushStore } from "@/stores/pushStore";
import { useTenantStore } from "@/stores/tenantStore";
import { API_ORIGIN, mockRoute, signIn } from "./_helpers";
import { server } from "./_server";
import { OTHER_TENANT_ID, TENANT_ID, makeJwt, SESSION_ID, USER_ID } from "./fixtures";

jest.mock("expo-device", () => ({ __esModule: true, isDevice: true, DeviceType: { PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 } }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const mockDevice = jest.requireMock("expo-device") as { isDevice: boolean };
const TOKENS = "/notifications/push/tokens";
const EXPO_TOKEN = "ExponentPushToken[abc123]";
const PROJECT_ID = "11111111-2222-4333-8444-555555555555";
const notif = jest.mocked(Notifications);

type Mutable = { EXPO_PUBLIC_EAS_PROJECT_ID?: string };
const mutableEnv = env as unknown as Mutable;

function grant(status: "granted" | "denied" | "undetermined") {
  notif.getPermissionsAsync.mockResolvedValue({ status, granted: status === "granted", canAskAgain: status !== "denied" } as never);
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockDevice.isDevice = true;
  mutableEnv.EXPO_PUBLIC_EAS_PROJECT_ID = PROJECT_ID;
  usePushStore.setState({ deviceId: null, enabled: true, promptDismissed: false, registered: {} });
  setOpenConversation(null);
  grant("granted");
  notif.getExpoPushTokenAsync.mockResolvedValue({ type: "expo", data: EXPO_TOKEN } as never);
  await signIn(TENANT_ID);
});

describe("push service", () => {
  it("sends the server's register body and rejects a token that is not an Expo token", async () => {
    const seen = mockRoute("post", TOKENS, { message: "Push token saved" });
    await PushClientService.register(TENANT_ID, { provider: "expo", token: EXPO_TOKEN, platform: "ios", deviceId: "d1", appVersion: "1.0.0" });
    expect(seen[0]).toMatchObject({ path: TOKENS, tenantId: TENANT_ID, body: { provider: "expo", token: EXPO_TOKEN, platform: "ios", deviceId: "d1", appVersion: "1.0.0" } });
    await expect(PushClientService.register(TENANT_ID, { provider: "expo", token: "abc", platform: "ios" })).rejects.toThrow();
    expect(seen).toHaveLength(1);
  });

  it("unregisters by install id in the query string, never by token", async () => {
    const seen = mockRoute("delete", TOKENS, { message: "Push token removed" });
    await PushClientService.unregister(TENANT_ID, { deviceId: "d1" });
    expect(seen[0].query).toEqual({ deviceId: "d1" });
    await expect(PushClientService.unregister(TENANT_ID, {})).rejects.toThrow();
  });
});

describe("permission and project id", () => {
  it("reads the OS permission and reports an unsupported device", async () => {
    expect(await getPushPermission()).toBe("granted");
    grant("undetermined");
    expect(await getPushPermission()).toBe("undetermined");
    grant("denied");
    expect(await getPushPermission()).toBe("denied");
    mockDevice.isDevice = false;
    expect(await getPushPermission()).toBe("unsupported");
    expect(await requestPushPermission()).toBe("unsupported");
    expect(notif.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("shows the OS prompt only when asked to", async () => {
    notif.requestPermissionsAsync.mockResolvedValue({ status: "denied", granted: false, canAskAgain: false } as never);
    expect(await requestPushPermission()).toBe("denied");
    expect(notif.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it("validates the EAS project id", () => {
    expect(resolveProjectId()).toBe(PROJECT_ID);
    mutableEnv.EXPO_PUBLIC_EAS_PROJECT_ID = "not-a-uuid";
    expect(resolveProjectId()).toBeNull();
    mutableEnv.EXPO_PUBLIC_EAS_PROJECT_ID = undefined;
    expect(resolveProjectId()).toBeNull();
  });
});

describe("registerPushForTenant", () => {
  it("registers the Expo token for the tenant with that tenant's bearer token and remembers it", async () => {
    const seen = mockRoute("post", TOKENS, { message: "Push token saved" });
    expect(await registerPushForTenant(TENANT_ID)).toBe("registered");
    expect(notif.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: PROJECT_ID });
    expect(seen).toHaveLength(1);
    expect(seen[0].tenantId).toBe(TENANT_ID);
    expect(seen[0].headers.authorization).toMatch(/^Bearer /);
    const body = seen[0].body as Record<string, unknown>;
    expect(body).toMatchObject({ provider: "expo", token: EXPO_TOKEN, platform: "ios", appVersion: env.EXPO_PUBLIC_APP_VERSION });
    expect(body.deviceId).toBe(usePushStore.getState().deviceId);
    expect(Object.keys(usePushStore.getState().registered)).toEqual([TENANT_ID]);
    // No push token is persisted.
    expect(JSON.stringify(usePushStore.getState())).not.toContain("ExponentPushToken");
  });

  it("registers for a second organization with that organization's own token pair", async () => {
    await setTokens(OTHER_TENANT_ID, { accessToken: makeJwt({ userId: USER_ID, userSessionId: SESSION_ID, tenantId: OTHER_TENANT_ID }), refreshToken: "r2" });
    const seen = mockRoute("post", TOKENS, { message: "ok" });
    await registerPushForTenant(OTHER_TENANT_ID);
    expect(seen[0].tenantId).toBe(OTHER_TENANT_ID);
    expect(seen[0].headers.authorization).toContain(
      makeJwt({ userId: USER_ID, userSessionId: SESSION_ID, tenantId: OTHER_TENANT_ID }),
    );
  });

  it("never prompts and never posts without a granted permission", async () => {
    const seen = mockRoute("post", TOKENS, {});
    grant("undetermined");
    expect(await registerPushForTenant(TENANT_ID)).toBe("permission-undetermined");
    grant("denied");
    expect(await registerPushForTenant(TENANT_ID)).toBe("permission-denied");
    expect(notif.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(seen).toHaveLength(0);
  });

  it("does nothing when the device switch is off, on an unsupported device, signed out, or without a project id", async () => {
    const seen = mockRoute("post", TOKENS, {});
    usePushStore.setState({ enabled: false });
    expect(await registerPushForTenant(TENANT_ID)).toBe("disabled");
    usePushStore.setState({ enabled: true });
    mockDevice.isDevice = false;
    expect(await registerPushForTenant(TENANT_ID)).toBe("unsupported");
    mockDevice.isDevice = true;
    expect(await registerPushForTenant(OTHER_TENANT_ID)).toBe("signed-out"); // no token pair for that organization
    mutableEnv.EXPO_PUBLIC_EAS_PROJECT_ID = undefined;
    expect(await registerPushForTenant(TENANT_ID)).toBe("no-project-id");
    useAuthStore.setState({ isAuthenticated: false });
    expect(await registerPushForTenant(TENANT_ID)).toBe("signed-out");
    expect(seen).toHaveLength(0);
  });

  it("reports a refused registration as failed and records nothing", async () => {
    mockRoute("post", TOKENS, () => ({ body: { message: "SUBSCRIPTION_LIMIT_REACHED" }, init: { status: 429 } }));
    expect(await registerPushForTenant(TENANT_ID)).toBe("failed");
    expect(usePushStore.getState().registered).toEqual({});
  });

  it("gives up when a sign-out happens while the Expo token is being fetched", async () => {
    const seen = mockRoute("post", TOKENS, {});
    let release: (v: unknown) => void = () => undefined;
    notif.getExpoPushTokenAsync.mockReturnValue(new Promise((resolve) => (release = resolve)) as never);
    const pending = registerPushForTenant(TENANT_ID);
    await waitFor(() => expect(notif.getExpoPushTokenAsync).toHaveBeenCalled());
    useAuthStore.setState({ isAuthenticated: false });
    release({ type: "expo", data: EXPO_TOKEN });
    expect(await pending).toBe("stale");
    expect(seen).toHaveLength(0);
  });

  it("lets a queued registration lose to a later sign-out", async () => {
    const seen = mockRoute("post", TOKENS, {});
    mockRoute("delete", TOKENS, {});
    usePushStore.setState({ deviceId: "d1" });
    const first = registerPushForTenant(TENANT_ID);
    const second = registerPushForTenant(TENANT_ID); // queued behind the first
    await unregisterAllPush(); // bumps the epoch synchronously
    expect(await first).toBe("stale");
    expect(await second).toBe("stale");
    expect(seen).toHaveLength(0);
  });
});

describe("unregisterAllPush", () => {
  async function signInTwo() {
    await setTokens(OTHER_TENANT_ID, { accessToken: makeJwt({ userId: USER_ID, userSessionId: SESSION_ID, tenantId: OTHER_TENANT_ID }), refreshToken: "r2" });
  }

  it("does nothing for an install that never registered", async () => {
    const seen = mockRoute("delete", TOKENS, {});
    await unregisterAllPush();
    expect(seen).toHaveLength(0);
  });

  it("removes this device in every organization that has a session, with each one's own token", async () => {
    await signInTwo();
    usePushStore.setState({ deviceId: "d1", registered: { [TENANT_ID]: "x" } });
    const seen = mockRoute("delete", TOKENS, { message: "Push token removed" });
    await unregisterAllPush();
    expect(seen.map((s) => s.tenantId).sort()).toEqual([TENANT_ID, OTHER_TENANT_ID].sort());
    expect(seen.every((s) => s.query.deviceId === "d1" && s.headers.authorization?.startsWith("Bearer "))).toBe(true);
    expect(usePushStore.getState().registered).toEqual({});
  });

  it("never throws and still clears the books when the server is unreachable", async () => {
    usePushStore.setState({ deviceId: "d1", registered: { [TENANT_ID]: "x" } });
    server.use(http.delete(`${API_ORIGIN}/api/tenant/:tenantId${TOKENS}`, () => HttpResponse.error()));
    await expect(unregisterAllPush()).resolves.toBeUndefined();
    expect(usePushStore.getState().registered).toEqual({});
  });

  it("stops waiting after the cap", async () => {
    jest.useFakeTimers();
    try {
      usePushStore.setState({ deviceId: "d1", registered: { [TENANT_ID]: "x" } });
      server.use(http.delete(`${API_ORIGIN}/api/tenant/:tenantId${TOKENS}`, () => new Promise(() => undefined)));
      const done = jest.fn();
      void unregisterAllPush().then(done);
      await jest.advanceTimersByTimeAsync(UNREGISTER_CAP_MS + 50);
      expect(done).toHaveBeenCalled();
      expect(usePushStore.getState().registered).toEqual({});
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("logout", () => {
  it("unregisters every organization BEFORE the sessions are revoked and the tokens cleared", async () => {
    usePushStore.setState({ deviceId: "d1", registered: { [TENANT_ID]: "x" } });
    const order: string[] = [];
    let tokenAtUnregister: string | null = null;
    server.use(
      http.delete(`${API_ORIGIN}/api/tenant/:tenantId${TOKENS}`, async () => {
        order.push("unregister");
        tokenAtUnregister = await getToken("accessToken", TENANT_ID);
        return HttpResponse.json({ message: "ok" });
      }),
      http.delete(`${API_ORIGIN}/api/tenant/:tenantId/auth/me/sessions/:id`, () => {
        order.push("revoke");
        return HttpResponse.json({ message: "ok" });
      }),
    );
    await logout();
    expect(order).toEqual(["unregister", "revoke"]);
    expect(tokenAtUnregister).not.toBeNull();
    expect(await getToken("accessToken", TENANT_ID)).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("completes the sign-out when the unregister request fails offline", async () => {
    usePushStore.setState({ deviceId: "d1", registered: { [TENANT_ID]: "x" } });
    server.use(
      http.delete(`${API_ORIGIN}/api/tenant/:tenantId${TOKENS}`, () => HttpResponse.error()),
      http.delete(`${API_ORIGIN}/api/tenant/:tenantId/auth/me/sessions/:id`, () => HttpResponse.error()),
    );
    await logout();
    expect(await getToken("accessToken", TENANT_ID)).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useTenantStore.getState().activeTenantId).toBeNull();
    expect(usePushStore.getState().registered).toEqual({});
    expect(usePushStore.getState().deviceId).toBe("d1"); // the install id survives a sign-out
  });
});

describe("notification payloads", () => {
  it("maps the server's message payload to the thread", () => {
    expect(pushTargetFor({ conversationId: "c1", messageId: "m1", url: "/messaging/c1", tag: "messaging:c1" })).toEqual({ kind: "conversation", conversationId: "c1" });
    expect(pushTargetFor({ url: "/messaging/c2" })).toEqual({ kind: "conversation", conversationId: "c2" });
    expect(pushTargetFor({ url: "/messaging/c3?x=1" })).toEqual({ kind: "conversation", conversationId: "c3" });
  });

  it("opens the notifications list for everything else, and never an arbitrary path", () => {
    expect(pushTargetFor(undefined)).toEqual({ kind: "notifications" });
    expect(pushTargetFor("text")).toEqual({ kind: "notifications" });
    expect(pushTargetFor({ url: "/admin/secret" })).toEqual({ kind: "notifications" });
    expect(pushTargetFor({ url: "https://evil.test/messaging/x" })).toEqual({ kind: "notifications" });
    expect(pushTargetFor({ conversationId: 7 })).toEqual({ kind: "notifications" });
  });

  const notification = (data: unknown, identifier = "n1") => ({ request: { identifier, content: { data } } }) as unknown as Notifications.Notification;

  it("shows a banner in the foreground, except for the conversation that is on screen", async () => {
    expect(await foregroundBehavior(notification({ conversationId: "c1" }))).toMatchObject({ shouldShowBanner: true, shouldShowList: true, shouldSetBadge: false });
    setOpenConversation("c1");
    expect(await foregroundBehavior(notification({ conversationId: "c1" }))).toMatchObject({ shouldShowBanner: false, shouldShowList: false });
    expect(await foregroundBehavior(notification({ conversationId: "c2" }))).toMatchObject({ shouldShowBanner: true });
  });

  const response = (data: unknown, id: string, actionIdentifier = Notifications.DEFAULT_ACTION_IDENTIFIER) =>
    ({ actionIdentifier, notification: notification(data, id) }) as unknown as Notifications.NotificationResponse;

  it("routes a tap to the thread or the list, once per notification", () => {
    openFromResponse(response({ conversationId: "c9" }, "t1"));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: "/messages/[conversationId]", params: { conversationId: "c9" } });
    openFromResponse(response({ conversationId: "c9" }, "t1")); // the same tap delivered again
    expect(router.push).toHaveBeenCalledTimes(1);
    openFromResponse(response({}, "t2"));
    expect(router.push).toHaveBeenLastCalledWith("/notifications");
    openFromResponse(response({}, "t3", "dismissed"));
    openFromResponse(null);
    expect(router.push).toHaveBeenCalledTimes(2);
  });
});

describe("usePushNotifications", () => {
  it("installs the foreground handler, registers the active tenant and re-registers on a token rotation", async () => {
    const seen = mockRoute("post", TOKENS, {});
    const sub = { remove: jest.fn() };
    let rotate: () => void = () => undefined;
    notif.addPushTokenListener.mockImplementation(((cb: () => void) => {
      rotate = cb;
      return sub;
    }) as never);
    const { unmount } = await renderHook(() => usePushNotifications(true));
    expect(notif.setNotificationHandler).toHaveBeenCalledWith({ handleNotification: foregroundBehavior });
    await waitFor(() => expect(seen).toHaveLength(1));
    await act(async () => rotate());
    await waitFor(() => expect(seen).toHaveLength(2));
    await unmount();
    expect(sub.remove).toHaveBeenCalled();
  });

  it("registers the other organization when it becomes active", async () => {
    await setTokens(OTHER_TENANT_ID, { accessToken: makeJwt({ userId: USER_ID, userSessionId: SESSION_ID, tenantId: OTHER_TENANT_ID }), refreshToken: "r2" });
    const seen = mockRoute("post", TOKENS, {});
    await renderHook(() => usePushNotifications(true));
    await waitFor(() => expect(seen).toHaveLength(1));
    await act(async () => useTenantStore.setState({ activeTenantId: OTHER_TENANT_ID }));
    await waitFor(() => expect(seen).toHaveLength(2));
    expect(seen.map((s) => s.tenantId)).toEqual([TENANT_ID, OTHER_TENANT_ID]);
  });

  it("does nothing while the shell is closed, and follows the device switch", async () => {
    const seen = mockRoute("post", TOKENS, {});
    usePushStore.setState({ enabled: false });
    await renderHook(() => usePushNotifications(true));
    await renderHook(() => usePushNotifications(false));
    expect(seen).toHaveLength(0);
    expect(notif.addPushTokenListener).not.toHaveBeenCalled();
  });

  it("opens the screen of a cold-start tap only once the shell is open, and follows live taps", async () => {
    const cold = {
      actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
      notification: { request: { identifier: "cold-1", content: { data: { conversationId: "c5" } } } },
    };
    let live: (r: unknown) => void = () => undefined;
    notif.getLastNotificationResponseAsync.mockResolvedValue(cold as never);
    notif.addNotificationResponseReceivedListener.mockImplementation(((cb: (r: unknown) => void) => {
      live = cb;
      return { remove: jest.fn() };
    }) as never);
    mockRoute("post", TOKENS, {});
    const closed = await renderHook(() => usePushNotifications(false));
    expect(notif.getLastNotificationResponseAsync).not.toHaveBeenCalled();
    await closed.unmount();
    await renderHook(() => usePushNotifications(true));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: "/messages/[conversationId]", params: { conversationId: "c5" } }));
    await act(async () => live({ ...cold, notification: { request: { identifier: "live-1", content: { data: {} } } } }));
    expect(router.push).toHaveBeenLastCalledWith("/notifications");
    notif.getLastNotificationResponseAsync.mockResolvedValue(null as never);
  });

  it("never touches the native notification emitter where push is unsupported (web, simulator)", async () => {
    mockDevice.isDevice = false;
    await renderHook(() => usePushNotifications(true));
    expect(notif.getLastNotificationResponseAsync).not.toHaveBeenCalled();
    expect(notif.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(notif.setNotificationHandler).not.toHaveBeenCalled();
  });
});

describe("registerPushForAllTenants", () => {
  it("registers every organization with its own token pair and answers with the active one", async () => {
    await setTokens(OTHER_TENANT_ID, { accessToken: makeJwt({ userId: USER_ID, userSessionId: SESSION_ID, tenantId: OTHER_TENANT_ID }), refreshToken: "r2" });
    useTenantStore.setState({ knownTenantIds: [TENANT_ID, OTHER_TENANT_ID] });
    const seen = mockRoute("post", TOKENS, {});
    await expect(registerPushForAllTenants()).resolves.toBe("registered");
    expect(seen.map((s) => s.tenantId).sort()).toEqual([TENANT_ID, OTHER_TENANT_ID].sort());
  });
});
