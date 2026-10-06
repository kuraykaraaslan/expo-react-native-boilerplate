import { NotificationClientService } from "@/services/user/notification.service.client";
import { ProfileClientService } from "@/services/user/profile.service.client";
import { notificationsJson, preferencesJson, userProfileJson } from "./fixtures";
import { mockRoute, signIn } from "./_helpers";

jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

beforeEach(() => signIn());

describe("profile", () => {
  it("getProfile parses the real profile, including platforms and fields the app does not list", async () => {
    mockRoute("get", "/auth/me/profile", { userProfile: userProfileJson });
    const profile = await ProfileClientService.getProfile();
    expect(profile?.name).toBe("Ayşe Yılmaz");
    expect(profile?.socialLinks[0].platform).toBe("GITLAB"); // not in the old 9-value enum
    expect(profile?.displayName).toBeNull();
  });

  it("getProfile returns null when the server has none", async () => {
    mockRoute("get", "/auth/me/profile", { userProfile: null });
    expect(await ProfileClientService.getProfile()).toBeNull();
  });

  it("updateProfile sends every key (the server's schema requires all five) under `userProfile`", async () => {
    const seen = mockRoute("put", "/auth/me/profile", { message: "PROFILE_UPDATED_SUCCESSFULLY", userProfile: { ...userProfileJson, name: "Ayşe K." } });

    const updated = await ProfileClientService.updateProfile({
      name: "Ayşe K.",
      biography: null,
      profilePicture: null,
      headerImage: null,
      socialLinks: [],
    });

    expect(seen[0].body).toEqual({
      userProfile: { name: "Ayşe K.", biography: null, profilePicture: null, headerImage: null, socialLinks: [] },
    });
    expect(updated?.name).toBe("Ayşe K.");
  });

  it("updateProfile refuses a payload missing a key before sending anything", async () => {
    const seen = mockRoute("put", "/auth/me/profile", {});
    await expect(ProfileClientService.updateProfile({ name: "x" } as never)).rejects.toBeDefined();
    expect(seen).toHaveLength(0);
  });
});

describe("preferences", () => {
  it("getPreferences returns language and theme (they are not on SafeUser)", async () => {
    mockRoute("get", "/auth/me/preferences", { userPreferences: preferencesJson });
    const prefs = await ProfileClientService.getPreferences();
    expect(prefs).toMatchObject({ theme: "SYSTEM", language: "tr", timezone: "Europe/Istanbul", firstDayOfWeek: "MON" });
  });

  it("updatePreferences sends only the fields given, under `userPreferences`", async () => {
    const seen = mockRoute("put", "/auth/me/preferences", { message: "PREFERENCES_UPDATED_SUCCESSFULLY", userPreferences: { ...preferencesJson, theme: "DARK" } });
    const updated = await ProfileClientService.updatePreferences({ theme: "DARK" });
    expect(seen[0].body).toEqual({ userPreferences: { theme: "DARK" } });
    expect(updated.theme).toBe("DARK");
  });

  it("updatePreferences rejects an invalid theme", async () => {
    mockRoute("put", "/auth/me/preferences", {});
    await expect(ProfileClientService.updatePreferences({ theme: "PURPLE" as never })).rejects.toBeDefined();
  });
});

describe("notifications", () => {
  it("getNotifications parses message, type, action and createdAt", async () => {
    mockRoute("get", "/auth/me/notifications", notificationsJson);
    const list = await NotificationClientService.getNotifications();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ title: "Welcome", type: "system", isRead: false });
    expect(list[0].action).toEqual({ label: "Open", url: "/admin" });
    expect(list[1].isRead).toBe(true);
  });

  it("markAsRead is PUT …/notifications/{id} — there is no /read suffix", async () => {
    const seen = mockRoute("put", "/auth/me/notifications/:id", { message: "Notification marked as read" });
    await NotificationClientService.markAsRead("n-1");
    expect(seen[0].method).toBe("PUT");
    expect(seen[0].path).toBe("/auth/me/notifications/n-1");
  });

  it("markAllAsRead, remove and clearAll use their own routes", async () => {
    const readAll = mockRoute("put", "/auth/me/notifications/read-all", { message: "All notifications marked as read" });
    const one = mockRoute("delete", "/auth/me/notifications/:id", { message: "Notification removed" });
    await NotificationClientService.markAllAsRead();
    await NotificationClientService.remove("n-2");
    expect(readAll[0].path).toBe("/auth/me/notifications/read-all");
    expect(one[0].path).toBe("/auth/me/notifications/n-2");

    const clear = mockRoute("delete", "/auth/me/notifications", { message: "Inbox cleared" });
    await NotificationClientService.clearAll();
    expect(clear[0].path).toBe("/auth/me/notifications");
  });
});
