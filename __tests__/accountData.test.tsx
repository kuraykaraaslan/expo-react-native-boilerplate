import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { DeleteAccountModal } from "@/components/compliance/DeleteAccountModal";
import { ExportDataModal } from "@/components/compliance/ExportDataModal";
import { accountHasOwnPassword, reauthFailure } from "@/libs/reauth";
import { getToken, setTokens } from "@/libs/secureStorage";
import { ComplianceClientService } from "@/services/compliance/compliance.service.client";
import { useAuthStore } from "@/stores/authStore";
import { useOutboxStore } from "@/stores/outboxStore";
import { useTenantStore } from "@/stores/tenantStore";
import { OTHER_TENANT_ID, TENANT_ID, userSecurityJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() } }));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn().mockResolvedValue({ type: "opened" }) }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" },
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@fortawesome/react-native-fontawesome", () => ({ FontAwesomeIcon: () => null }));

const DELETE = "/auth/me/deletion-request";
const EXPORT = "/auth/me/data-export-request";
const completed = { status: "COMPLETED", tenants: [{ tenantId: TENANT_ID, privacyRequestId: "r1", status: "COMPLETED", erased: 12, retained: 0 }], tenantsScheduledForDeletion: [] };
const partial = { ...completed, status: "PARTIAL", tenants: [{ tenantId: TENANT_ID, status: "FAILED", erased: 0, retained: 0, error: "boom" }] };
const passwordRequired = () => fail(400, { message: "Enter your password to confirm", code: "VALIDATION_ERROR" });
const wrongPassword = () => fail(401, { message: "That password is not correct", code: "UNAUTHORIZED" });

beforeEach(async () => {
  jest.clearAllMocks();
  await signIn();
  // A second organization this device is also signed in to: deletion must clear it too.
  await setTokens(OTHER_TENANT_ID, { accessToken: "access-other", refreshToken: "refresh-other" });
  useOutboxStore.getState().clearAll();
});

describe("account deletion service", () => {
  it("sends the password, and nothing else, to the account-scope route", async () => {
    const seen = mockRoute("post", DELETE, completed);
    const res = await ComplianceClientService.requestAccountDeletion("hunter2");
    expect(seen[0].body).toEqual({ password: "hunter2" });
    expect(res.status).toBe("COMPLETED");
  });

  it("sends an empty body when the account has no password", async () => {
    const seen = mockRoute("post", DELETE, completed);
    await ComplianceClientService.requestAccountDeletion();
    expect(seen[0].body).toEqual({});
  });

  it("reads PARTIAL with a FAILED workspace and ignores the server's internal error text", async () => {
    mockRoute("post", DELETE, partial);
    const res = await ComplianceClientService.requestAccountDeletion("pw");
    expect(res.status).toBe("PARTIAL");
    expect(res.tenants[0]).toEqual({ tenantId: TENANT_ID, status: "FAILED", erased: 0, retained: 0 });
  });

  it("reads the stranded workspaces from a 409, and nothing from other 409s", async () => {
    mockRoute("post", DELETE, () => fail(409, { message: "You are the only owner", code: "CONFLICT", details: { tenants: [{ tenantId: "t9", name: "Acme" }] } }));
    const err = await ComplianceClientService.requestAccountDeletion("pw").catch((e: unknown) => e);
    expect(ComplianceClientService.deletionConflictTenants(err)).toEqual([{ tenantId: "t9", name: "Acme" }]);

    mockRoute("post", DELETE, () => fail(409, { message: "A platform administrator cannot delete their own account here", code: "CONFLICT" }));
    const admin = await ComplianceClientService.requestAccountDeletion("pw").catch((e: unknown) => e);
    expect(ComplianceClientService.deletionConflictTenants(admin)).toBeNull();
  });

  it("classifies the two password refusals", async () => {
    mockRoute("post", DELETE, passwordRequired);
    expect(reauthFailure(await ComplianceClientService.requestAccountDeletion().catch((e: unknown) => e))).toBe("password-required");
    mockRoute("post", DELETE, wrongPassword);
    expect(reauthFailure(await ComplianceClientService.requestAccountDeletion("x").catch((e: unknown) => e))).toBe("invalid-password");
    // A wrong password must not end the session (it is a 401 the transport leaves alone).
    expect(await getToken("accessToken", TENANT_ID)).not.toBeNull();
  });
});

describe("data export service", () => {
  it("pins the request to the given organization and parses the link answer", async () => {
    const seen = mockRoute("post", EXPORT, { privacyRequestId: "r2", account: { user: { userId: "u1" } }, url: "https://files.test/d.json?sig=1", expiresIn: 900 });
    const res = await ComplianceClientService.requestDataExport(OTHER_TENANT_ID, "pw");
    expect(seen[0]).toMatchObject({ tenantId: OTHER_TENANT_ID, body: { password: "pw" } });
    expect(res.url).toBe("https://files.test/d.json?sig=1");
    expect(res.dossier).toBeUndefined();
  });

  it("parses the inline dossier answer", async () => {
    mockRoute("post", EXPORT, { privacyRequestId: "r2", account: {}, dossier: { totalRows: 3, sections: [] } });
    const res = await ComplianceClientService.requestDataExport(TENANT_ID);
    expect(res.dossier).toEqual({ totalRows: 3, sections: [] });
    expect(res.url).toBeUndefined();
  });
});

describe("accountHasOwnPassword", () => {
  const social = { accounts: [{ userSocialAccountId: "sa1", provider: "google", displayName: "Google", tokenExpired: false }] };

  it("is true without linked social sign-ins, or with a stamped passwordChangedAt", async () => {
    mockRoute("get", "/auth/me/security", { userSecurity: { ...userSecurityJson, passwordChangedAt: null } });
    mockRoute("get", "/auth/me/social-accounts", { accounts: [] });
    expect(await accountHasOwnPassword()).toBe(true);
    mockRoute("get", "/auth/me/security", { userSecurity: { ...userSecurityJson, passwordChangedAt: "2026-10-01T00:00:00.000Z" } });
    mockRoute("get", "/auth/me/social-accounts", social);
    expect(await accountHasOwnPassword()).toBe(true);
  });

  it("is false for a social-only account and null when a read fails", async () => {
    mockRoute("get", "/auth/me/security", { userSecurity: { ...userSecurityJson, passwordChangedAt: null } });
    mockRoute("get", "/auth/me/social-accounts", social);
    expect(await accountHasOwnPassword()).toBe(false);
    mockRoute("get", "/auth/me/social-accounts", () => fail(500, { message: "x" }));
    expect(await accountHasOwnPassword()).toBeNull();
  });
});

describe("DeleteAccountModal", () => {
  const renderModal = (hasPassword: boolean | null = true) => render(<DeleteAccountModal open onClose={jest.fn()} hasPassword={hasPassword} />);

  it("arms the button only after the typed word and the password", async () => {
    await renderModal();
    const confirm = () => screen.getByTestId("delete-account-confirm");
    expect(confirm().props.accessibilityState?.disabled ?? confirm().props.disabled).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "delete");
    expect(confirm().props.accessibilityState?.disabled ?? confirm().props.disabled).toBeTruthy(); // password still empty
    await fireEvent.changeText(screen.getByTestId("delete-account-password"), "hunter2");
    expect(confirm().props.accessibilityState?.disabled ?? confirm().props.disabled).toBeFalsy();
  });

  it("deletes, then wipes every organization's tokens locally without any server logout, and routes to login", async () => {
    const del = mockRoute("post", DELETE, completed);
    const logoutCalls = mockRoute("delete", "/auth/me/sessions/:id", {});
    useOutboxStore.setState({ entries: [{ id: "x" } as never] } as never);
    await renderModal();
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "DELETE");
    await fireEvent.changeText(screen.getByTestId("delete-account-password"), "hunter2");
    await fireEvent.press(screen.getByTestId("delete-account-confirm"));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(del[0].body).toEqual({ password: "hunter2" });
    expect(logoutCalls).toHaveLength(0);
    expect(await getToken("accessToken", TENANT_ID)).toBeNull();
    expect(await getToken("refreshToken", OTHER_TENANT_ID)).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, user: null });
    expect(useTenantStore.getState()).toMatchObject({ activeTenantId: null, memberships: [] });
    expect(useOutboxStore.getState().entries).toEqual([]);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("warning");
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
    expect(toast.success).toHaveBeenCalledWith("Your account was deleted.", expect.anything());
  });

  it("explains a PARTIAL result but still signs out", async () => {
    mockRoute("post", DELETE, partial);
    await renderModal();
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "DELETE");
    await fireEvent.changeText(screen.getByTestId("delete-account-password"), "pw");
    await fireEvent.press(screen.getByTestId("delete-account-confirm"));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Some records are kept"), expect.anything());
    expect(await getToken("accessToken", TENANT_ID)).toBeNull();
  });

  it("does not ask for a password when the account has none, and sends an empty body", async () => {
    const del = mockRoute("post", DELETE, completed);
    await renderModal(false);
    expect(screen.queryByTestId("delete-account-password")).toBeNull();
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "DELETE");
    await fireEvent.press(screen.getByTestId("delete-account-confirm"));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(del[0].body).toEqual({});
  });

  it("reveals the password field when the server says one is needed after all, and keeps the session", async () => {
    mockRoute("post", DELETE, passwordRequired);
    await renderModal(false);
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "DELETE");
    await fireEvent.press(screen.getByTestId("delete-account-confirm"));
    await waitFor(() => expect(screen.getByTestId("delete-account-password")).toBeTruthy());
    expect(screen.getByText("Enter your password to confirm.")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
    expect(await getToken("accessToken", TENANT_ID)).not.toBeNull();
  });

  it("shows a wrong password inline and wipes nothing", async () => {
    mockRoute("post", DELETE, wrongPassword);
    await renderModal();
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "DELETE");
    await fireEvent.changeText(screen.getByTestId("delete-account-password"), "nope");
    await fireEvent.press(screen.getByTestId("delete-account-confirm"));
    await waitFor(() => expect(screen.getByText("That password is not correct.")).toBeTruthy());
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("error");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(await getToken("accessToken", TENANT_ID)).not.toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("lists the workspaces of a last-owner 409 and wipes nothing", async () => {
    mockRoute("post", DELETE, () => fail(409, { message: "You are the only owner of a workspace that still has other members.", code: "CONFLICT", details: { tenants: [{ tenantId: "t9", name: "Acme Ltd" }, { tenantId: "t8" }] } }));
    await renderModal();
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "DELETE");
    await fireEvent.changeText(screen.getByTestId("delete-account-password"), "pw");
    await fireEvent.press(screen.getByTestId("delete-account-confirm"));
    await waitFor(() => expect(screen.getByTestId("delete-account-conflict-list")).toBeTruthy());
    expect(screen.getByText("• Acme Ltd")).toBeTruthy();
    expect(screen.getByText("• t8")).toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(await getToken("accessToken", OTHER_TENANT_ID)).not.toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("explains a platform-admin 409 (no tenants) without wiping anything", async () => {
    mockRoute("post", DELETE, () => fail(409, { message: "A platform administrator cannot delete their own account here; another administrator must do it", code: "CONFLICT" }));
    await renderModal();
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "DELETE");
    await fireEvent.changeText(screen.getByTestId("delete-account-password"), "pw");
    await fireEvent.press(screen.getByTestId("delete-account-confirm"));
    await waitFor(() => expect(screen.getByTestId("delete-account-blocked")).toBeTruthy());
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("surfaces any other server error as a toast and keeps the session", async () => {
    mockRoute("post", DELETE, () => fail(500, { message: "Internal server error" }));
    await renderModal();
    await fireEvent.changeText(screen.getByTestId("delete-account-word"), "DELETE");
    await fireEvent.changeText(screen.getByTestId("delete-account-password"), "pw");
    await fireEvent.press(screen.getByTestId("delete-account-confirm"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe("ExportDataModal", () => {
  const renderModal = (hasPassword: boolean | null = true) => render(<ExportDataModal open onClose={jest.fn()} hasPassword={hasPassword} />);

  it("opens the download link in the in-app browser and offers to share the account details", async () => {
    const seen = mockRoute("post", EXPORT, { privacyRequestId: "r2", account: { user: { email: "a@b.c" } }, url: "https://files.test/d.json?sig=1", expiresIn: 900 });
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    await renderModal();
    await fireEvent.changeText(screen.getByTestId("export-data-password"), "pw");
    await fireEvent.press(screen.getByTestId("export-data-confirm"));
    await waitFor(() => expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://files.test/d.json?sig=1"));
    expect(seen[0]).toMatchObject({ tenantId: TENANT_ID, body: { password: "pw" } });
    await fireEvent.press(screen.getByTestId("export-data-share"));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ message: JSON.stringify({ account: { user: { email: "a@b.c" } } }, null, 2) }));
  });

  it("shares an inline dossier through the system share sheet", async () => {
    mockRoute("post", EXPORT, { privacyRequestId: "r2", account: {}, dossier: { totalRows: 1, sections: [] } });
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    await renderModal(false);
    await fireEvent.press(screen.getByTestId("export-data-confirm"));
    await waitFor(() => expect(screen.getByTestId("export-data-share")).toBeTruthy());
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId("export-data-open")).toBeNull();
    await fireEvent.press(screen.getByTestId("export-data-share"));
    expect(JSON.parse(share.mock.calls[0][0].message as string)).toEqual({ account: {}, dossier: { totalRows: 1, sections: [] } });
  });

  it("never opens a non-http link", async () => {
    mockRoute("post", EXPORT, { privacyRequestId: "r2", account: {}, url: "javascript:alert(1)" });
    await renderModal(false);
    await fireEvent.press(screen.getByTestId("export-data-confirm"));
    await waitFor(() => expect(screen.getByTestId("export-data-share")).toBeTruthy());
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId("export-data-open")).toBeNull();
  });

  it("asks for the password after a 400 and shows a wrong password inline", async () => {
    mockRoute("post", EXPORT, passwordRequired);
    await renderModal(false);
    await fireEvent.press(screen.getByTestId("export-data-confirm"));
    await waitFor(() => expect(screen.getByTestId("export-data-password")).toBeTruthy());
    mockRoute("post", EXPORT, wrongPassword);
    await fireEvent.changeText(screen.getByTestId("export-data-password"), "nope");
    await fireEvent.press(screen.getByTestId("export-data-confirm"));
    await waitFor(() => expect(screen.getByText("That password is not correct.")).toBeTruthy());
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("drops an answer that arrives after an organization switch", async () => {
    mockRoute("post", EXPORT, () => {
      useTenantStore.setState({ activeTenantId: OTHER_TENANT_ID });
      return { body: { privacyRequestId: "r2", account: {}, url: "https://files.test/d.json" } };
    });
    await renderModal(false);
    await fireEvent.press(screen.getByTestId("export-data-confirm"));
    await waitFor(() => expect(Haptics.impactAsync).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId("export-data-share")).toBeNull();
  });

  it("drops an answer that arrives after a sign-out", async () => {
    mockRoute("post", EXPORT, () => {
      useAuthStore.setState({ isAuthenticated: false });
      return { body: { privacyRequestId: "r2", account: {}, url: "https://files.test/d.json" } };
    });
    await renderModal(false);
    await fireEvent.press(screen.getByTestId("export-data-confirm"));
    await new Promise((r) => setTimeout(r, 50));
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId("export-data-share")).toBeNull();
  });
});
