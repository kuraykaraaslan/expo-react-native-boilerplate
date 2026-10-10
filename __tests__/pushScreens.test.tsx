import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { http, HttpResponse } from "msw";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { PushPrePrompt, PREPROMPT_DELAY_MS } from "@/components/notifications/PushPrePrompt";
import { DeleteAccountModal } from "@/components/compliance/DeleteAccountModal";
import NotificationSettingsScreen from "@/app/(drawer)/settings/notifications";
import { env } from "@/libs/env";
import { usePushStore } from "@/stores/pushStore";
import { API_ORIGIN, fail, mockRoute, signIn } from "./_helpers";
import { server } from "./_server";
import { TENANT_ID } from "./fixtures";

jest.mock("expo-device", () => ({ __esModule: true, isDevice: true, DeviceType: { PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 } }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" },
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@fortawesome/react-native-fontawesome", () => ({ FontAwesomeIcon: () => null }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const TOKENS = "/notifications/push/tokens";
const PREFS = "/auth/me/preferences";
const notif = jest.mocked(Notifications);
const prefs = (pushNotifications: boolean) => ({ userPreferences: { theme: "SYSTEM", language: "en", timezone: "UTC", dateFormat: "DD_MM_YYYY", timeFormat: "H24", firstDayOfWeek: "MON", emailNotifications: true, smsNotifications: false, pushNotifications, newsletter: false } });

function grant(status: "granted" | "denied" | "undetermined") {
  notif.getPermissionsAsync.mockResolvedValue({ status, granted: status === "granted", canAskAgain: status !== "denied" } as never);
}

beforeEach(async () => {
  jest.clearAllMocks();
  (env as { EXPO_PUBLIC_EAS_PROJECT_ID?: string }).EXPO_PUBLIC_EAS_PROJECT_ID = "11111111-2222-4333-8444-555555555555";
  usePushStore.setState({ deviceId: null, enabled: true, promptDismissed: false, registered: {} });
  grant("undetermined");
  notif.getExpoPushTokenAsync.mockResolvedValue({ type: "expo", data: "ExponentPushToken[abc123]" } as never);
  await signIn(TENANT_ID);
});

describe("PushPrePrompt", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function open() {
    await render(<PushPrePrompt />);
    expect(screen.queryByTestId("push-preprompt-enable")).toBeNull(); // not at launch
    await act(async () => {
      await jest.advanceTimersByTimeAsync(PREPROMPT_DELAY_MS + 10);
    });
    jest.useRealTimers(); // the network layer needs real timers from here on
  }

  it("explains first, and only the button shows the OS prompt, then registers the active organization", async () => {
    const seen = mockRoute("post", TOKENS, {});
    notif.requestPermissionsAsync.mockImplementation(async () => {
      grant("granted");
      return { status: "granted", granted: true, canAskAgain: true } as never;
    });
    await open();
    expect(screen.getByText("Stay in the loop")).toBeTruthy();
    expect(notif.requestPermissionsAsync).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("push-preprompt-enable"));
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0].tenantId).toBe(TENANT_ID);
    expect(toast.success).toHaveBeenCalledWith("Notifications are on");
    expect(usePushStore.getState().promptDismissed).toBe(true);
  });

  it("remembers 'not now' and never asks the OS", async () => {
    await open();
    await fireEvent.press(screen.getByTestId("push-preprompt-later"));
    expect(usePushStore.getState().promptDismissed).toBe(true);
    expect(notif.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId("push-preprompt-enable")).toBeNull();
  });

  it("tells the person when the OS prompt is refused", async () => {
    notif.requestPermissionsAsync.mockResolvedValue({ status: "denied", granted: false, canAskAgain: false } as never);
    await open();
    await fireEvent.press(screen.getByTestId("push-preprompt-enable"));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("stay off")));
  });

  it("stays hidden once the permission is decided", async () => {
    grant("denied");
    await open();
    expect(screen.queryByTestId("push-preprompt-enable")).toBeNull();
  });
});

describe("notification settings screen", () => {
  it("shows the system-settings link instead of a dead switch when the permission is denied", async () => {
    grant("denied");
    mockRoute("get", PREFS, prefs(true));
    const open = jest.spyOn(Linking, "openSettings").mockResolvedValue();
    await render(<NotificationSettingsScreen />);
    await waitFor(() => expect(screen.getByText("Notifications are blocked")).toBeTruthy());
    await fireEvent.press(screen.getByText("Open system settings"));
    expect(open).toHaveBeenCalled();
    open.mockRestore();
  });

  it("turning the device switch off removes this device's tokens and keeps it off", async () => {
    grant("granted");
    usePushStore.setState({ deviceId: "d1", registered: { [TENANT_ID]: "x" } });
    mockRoute("get", PREFS, prefs(true));
    const removed = mockRoute("delete", TOKENS, {});
    await render(<NotificationSettingsScreen />);
    const toggle = await screen.findByLabelText("Push notifications on this device");
    await fireEvent.press(toggle);
    await waitFor(() => expect(removed).toHaveLength(1));
    expect(usePushStore.getState().enabled).toBe(false);
    expect(removed[0].query.deviceId).toBe("d1");
  });

  it("saves the account-wide preference and rolls it back when the save fails", async () => {
    grant("granted");
    mockRoute("get", PREFS, prefs(true));
    const saved = mockRoute("put", PREFS, () => fail(500, { message: "boom" }));
    await render(<NotificationSettingsScreen />);
    const toggle = await screen.findByLabelText("Push notifications");
    await waitFor(() => expect(toggle.props.accessibilityState?.checked).toBe(true));
    await fireEvent.press(toggle);
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].body).toEqual({ userPreferences: { pushNotifications: false } });
    await waitFor(() => expect(screen.getByLabelText("Push notifications").props.accessibilityState?.checked).toBe(true));
  });
});

describe("account deletion", () => {
  const DELETE = "/auth/me/deletion-request";
  const completed = { status: "COMPLETED", tenants: [{ tenantId: TENANT_ID, privacyRequestId: "r1", status: "COMPLETED", erased: 1, retained: 0 }], tenantsScheduledForDeletion: [] };

  async function confirm() {
    await render(<DeleteAccountModal open onClose={jest.fn()} hasPassword />);
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "DELETE");
    await fireEvent.changeText(screen.getByTestId("delete-account-password"), "pw");
    await fireEvent.press(screen.getByTestId("delete-account-confirm"));
  }

  it("removes the push tokens BEFORE asking the server to delete (which revokes every session)", async () => {
    grant("granted");
    usePushStore.setState({ deviceId: "d1", registered: { [TENANT_ID]: "x" } });
    const order: string[] = [];
    server.use(
      http.delete(`${API_ORIGIN}/api/tenant/:tenantId${TOKENS}`, () => {
        order.push("unregister");
        return HttpResponse.json({ message: "ok" });
      }),
      http.post(`${API_ORIGIN}/api/tenant/:tenantId${DELETE}`, () => {
        order.push("delete-account");
        return HttpResponse.json(completed);
      }),
    );
    await confirm();
    await waitFor(() => expect(order).toEqual(["unregister", "delete-account"]));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login")); // let the local wipe finish before the next test
  });

  it("registers this device again when the deletion is refused", async () => {
    grant("granted");
    usePushStore.setState({ deviceId: "d1", registered: { [TENANT_ID]: "x" } });
    mockRoute("delete", TOKENS, {});
    const again = mockRoute("post", TOKENS, {});
    mockRoute("post", DELETE, () => fail(401, { message: "That password is not correct", code: "UNAUTHORIZED" }));
    await confirm();
    await waitFor(() => expect(again).toHaveLength(1));
  });
});
