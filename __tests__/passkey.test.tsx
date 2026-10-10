import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { NativeModules } from "react-native";
import { Passkey as NativePasskey } from "react-native-passkey";
import { toast } from "sonner-native";
import { PasskeyButton } from "@/components/auth/PasskeyButton";
import { PasskeysCard } from "@/components/security/PasskeysCard";
import { env } from "@/libs/env";
import {
  classifyPasskeyError,
  passkeysAvailable,
  registerPasskey,
  signInWithPasskey,
  toAssertionResponse,
  toNativeCreateRequest,
  toNativeGetRequest,
  toRegistrationResponse,
} from "@/libs/passkey";
import { clearAllTokens, getToken } from "@/libs/secureStorage";
import { PasskeyClientService } from "@/services/auth/passkey.service.client";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { OTHER_TENANT_ID, TENANT_ID, USER_ID, deviceLoginJson, makeJwt, safeUserJson } from "./fixtures";
import { fail, mockRoute, signIn } from "./_helpers";

jest.mock("react-native-passkey", () => ({ Passkey: { isSupported: jest.fn(), create: jest.fn(), get: jest.fn() } }));
jest.mock("expo-device", () => ({ __esModule: true, isDevice: true, brand: "Acme", modelName: "Phone 1", deviceName: "Ayse's phone", osName: "Android", osVersion: "15", deviceType: 1, DeviceType: { PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), warning: jest.fn() } }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" },
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@fortawesome/react-native-fontawesome", () => ({ FontAwesomeIcon: () => null }));
jest.mock("@/libs/logger", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() } }));

const native = jest.mocked(NativePasskey);
const mutableEnv = env as { EXPO_PUBLIC_PASSKEY_RP_ID?: string };
const modules = NativeModules as Record<string, unknown>;

const LOGIN_OPTIONS = "/auth/device/passkey/login/options";
const LOGIN_VERIFY = "/auth/device/passkey/login/verify";
const LIST = "/auth/me/security/passkeys";
const REGISTER = "/auth/me/security/passkeys/register";

// What @simplewebauthn/server v13 hands out (JSON), as the routes pass it through.
const loginOptions = { challenge: "chal-login", rpId: "app.example.test", timeout: 60000, allowCredentials: [{ id: "cred-1", transports: ["internal"] }], userVerification: "preferred" };
const registrationOptions = {
  challenge: "chal-reg",
  rp: { name: "Acme", id: "app.example.test" },
  user: { id: "dXNlci1pZA", name: "ayse@example.com", displayName: "Ayse" },
  pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
  timeout: 60000,
  attestation: "none",
  excludeCredentials: [{ id: "cred-1", transports: ["internal"] }],
  authenticatorSelection: { residentKey: "preferred", userVerification: "preferred", requireResidentKey: false },
};
const nativeAssertion = { id: "cred-1", rawId: "cred-1", response: { authenticatorData: "ad", clientDataJSON: "cd", signature: "sig", userHandle: "uh" } };
const nativeAttestation = { id: "cred-2", rawId: "cred-2", response: { clientDataJSON: "cd", attestationObject: "ao", transports: ["internal"] } };
const passkeyRow = (id: string, label: string, lastUsedAt: string | null = null) => ({ credentialId: id, label, createdAt: "2026-10-01T10:00:00.000Z", lastUsedAt, transports: ["internal"] });
const list = (rows: unknown[]) => ({ passkeys: rows, backupGuidance: { passkeyCount: rows.length, shouldAddBackup: rows.length === 1, reason: rows.length === 1 ? "single_passkey" : null } });
const passkeyLogin = { ...deviceLoginJson, passwordExpiresInDays: undefined, accessToken: makeJwt({ userId: USER_ID, userSessionId: "s-pk", tenantId: TENANT_ID }), refreshToken: "refresh-pk" };

beforeEach(async () => {
  jest.clearAllMocks();
  mutableEnv.EXPO_PUBLIC_PASSKEY_RP_ID = "app.example.test";
  modules.Passkey = {};
  native.isSupported.mockReturnValue(true);
  await signIn(TENANT_ID);
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

describe("availability", () => {
  it("is on only when the module is linked, the OS supports it and the owner set the RP domain", () => {
    expect(passkeysAvailable()).toBe(true);
    modules.Passkey = undefined; // Expo Go / a build without the module: never call into the throwing proxy
    expect(passkeysAvailable()).toBe(false);
    modules.Passkey = {};
    native.isSupported.mockReturnValue(false);
    expect(passkeysAvailable()).toBe(false);
    native.isSupported.mockReturnValue(true);
    mutableEnv.EXPO_PUBLIC_PASSKEY_RP_ID = undefined;
    expect(passkeysAvailable()).toBe(false);
  });

  it("treats a throwing native check as unavailable", () => {
    native.isSupported.mockImplementation(() => {
      throw new Error("not linked");
    });
    expect(passkeysAvailable()).toBe(false);
  });

  it("hides the login button entirely and never touches the network or the OS", async () => {
    modules.Passkey = undefined;
    await render(<PasskeyButton onSignedIn={jest.fn()} />);
    expect(screen.queryByTestId("auth-login-passkey")).toBeNull();
    expect(native.get).not.toHaveBeenCalled();
  });
});

describe("native error mapping", () => {
  it.each([
    [{ error: "UserCancelled", message: "x" }, "cancelled"],
    [{ error: "NoCredentials", message: "x" }, "no-credentials"],
    [{ error: "CredentialAlreadyExists", message: "x" }, "already-exists"],
    [{ error: "BadConfiguration", message: "x" }, "misconfigured"],
    [{ error: "NotSupported", message: "x" }, "unsupported"],
    [{ error: "RequestFailed", message: "x" }, "failed"],
  ])("%j -> %s", (err, expected) => {
    expect(classifyPasskeyError(err)).toBe(expected);
  });

  it("leaves HTTP and parse errors to the API error handler", () => {
    expect(classifyPasskeyError(new Error("boom"))).toBeNull();
    expect(classifyPasskeyError({ response: { status: 400 } })).toBeNull();
  });
});

describe("WebAuthn JSON mapping", () => {
  it("adds the credential type the server's verifier insists on and drops what it does not read", () => {
    const res = toAssertionResponse({ ...nativeAssertion, response: { ...nativeAssertion.response, attestationObject: "junk" } } as never);
    expect(res).toEqual({
      id: "cred-1",
      rawId: "cred-1",
      type: "public-key",
      clientExtensionResults: {},
      response: { authenticatorData: "ad", clientDataJSON: "cd", signature: "sig", userHandle: "uh" },
    });
    expect(toRegistrationResponse({ id: "c", response: { clientDataJSON: "cd", attestationObject: "ao" } } as never)).toMatchObject({ rawId: "c", type: "public-key" });
  });

  it("types the credential descriptors of both requests", () => {
    expect(toNativeGetRequest(loginOptions as never).allowCredentials).toEqual([{ type: "public-key", id: "cred-1", transports: ["internal"] }]);
    expect(toNativeCreateRequest(registrationOptions as never).excludeCredentials).toEqual([{ type: "public-key", id: "cred-1", transports: ["internal"] }]);
  });
});

describe("service", () => {
  it("asks for options with or without an e-mail, without any token", async () => {
    const seen = mockRoute("post", LOGIN_OPTIONS, loginOptions);
    await PasskeyClientService.loginOptions("ayse@example.com");
    await PasskeyClientService.loginOptions();
    expect(seen.map((s) => s.body)).toEqual([{ email: "ayse@example.com" }, {}]);
    expect(seen[0].headers.authorization).toBeUndefined();
  });

  it("reads the list with the backup guidance, and tolerates columns it does not model", async () => {
    mockRoute("get", LIST, { passkeys: [{ ...passkeyRow("c1", "Phone"), extra: 1 }], backupGuidance: { passkeyCount: 1, shouldAddBackup: true, reason: "single_passkey" } });
    const res = await PasskeyClientService.list();
    expect(res.passkeys[0]).toMatchObject({ credentialId: "c1", label: "Phone" });
    expect(res.backupGuidance?.shouldAddBackup).toBe(true);
  });

  it("encodes the credential id in the path for rename and remove", async () => {
    const rename = mockRoute("patch", `${LIST}/:id`, { passkey: passkeyRow("a/b", "New") });
    const remove = mockRoute("delete", `${LIST}/:id`, { message: "PASSKEY_DELETED_SUCCESSFULLY" });
    await expect(PasskeyClientService.rename("a/b", "New")).resolves.toMatchObject({ label: "New" });
    await PasskeyClientService.remove("a/b");
    expect(rename[0].path).toBe(`${LIST}/a%2Fb`);
    expect(rename[0].body).toEqual({ label: "New" });
    expect(remove[0].path).toBe(`${LIST}/a%2Fb`);
  });
});

describe("sign in with a passkey", () => {
  beforeEach(async () => {
    await clearAllTokens(); // signed out: whatever is stored afterwards came from the passkey login
  });

  it("runs options -> sheet -> verify and starts the session exactly like a password login (per-tenant pair)", async () => {
    const options = mockRoute("post", LOGIN_OPTIONS, loginOptions);
    const verify = mockRoute("post", LOGIN_VERIFY, passkeyLogin);
    native.get.mockResolvedValue(nativeAssertion as never);

    const result = await signInWithPasskey("ayse@example.com");

    expect(options[0].body).toEqual({ email: "ayse@example.com" });
    expect(native.get).toHaveBeenCalledWith(expect.objectContaining({ challenge: "chal-login", rpId: "app.example.test" }));
    expect(verify[0].tenantId).toBe(TENANT_ID);
    expect(verify[0].headers.authorization).toBeUndefined();
    expect(verify[0].body).toMatchObject({ email: "ayse@example.com", response: { type: "public-key", id: "cred-1" }, device: { brand: "Acme" } });
    expect(result).toMatchObject({ status: "signed-in", otpRequired: false, mustChangePassword: false });
    expect(await getToken("accessToken", TENANT_ID)).toBe(passkeyLogin.accessToken);
    expect(await getToken("refreshToken", TENANT_ID)).toBe("refresh-pk");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.userId).toBe(safeUserJson.userId);
  });

  it("goes usernameless without an e-mail", async () => {
    const options = mockRoute("post", LOGIN_OPTIONS, { ...loginOptions, allowCredentials: undefined });
    mockRoute("post", LOGIN_VERIFY, passkeyLogin);
    native.get.mockResolvedValue(nativeAssertion as never);
    await signInWithPasskey();
    expect(options[0].body).toEqual({});
  });

  it("says nothing and stores nothing when the sheet is dismissed", async () => {
    mockRoute("post", LOGIN_OPTIONS, loginOptions);
    const verify = mockRoute("post", LOGIN_VERIFY, passkeyLogin);
    native.get.mockRejectedValue({ error: "UserCancelled", message: "cancelled" });
    await expect(signInWithPasskey()).resolves.toEqual({ status: "cancelled" });
    expect(verify).toHaveLength(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("reports an OS failure as a reason, not an exception", async () => {
    mockRoute("post", LOGIN_OPTIONS, loginOptions);
    native.get.mockRejectedValue({ error: "NoCredentials", message: "none" });
    await expect(signInWithPasskey()).resolves.toEqual({ status: "failed", reason: "no-credentials" });
  });

  it("throws server refusals for the API error handler and stores nothing", async () => {
    mockRoute("post", LOGIN_OPTIONS, loginOptions);
    mockRoute("post", LOGIN_VERIFY, () => fail(403, { message: "You are not a member of this organization" }));
    native.get.mockResolvedValue(nativeAssertion as never);
    await expect(signInWithPasskey()).rejects.toMatchObject({ response: { status: 403 } });
    expect(await getToken("accessToken", TENANT_ID)).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("drops the answer when the organization changed while the sheet was open", async () => {
    mockRoute("post", LOGIN_OPTIONS, loginOptions);
    const verify = mockRoute("post", LOGIN_VERIFY, passkeyLogin);
    native.get.mockImplementation(async () => {
      useTenantStore.getState().setActiveTenantId(OTHER_TENANT_ID);
      return nativeAssertion as never;
    });
    await expect(signInWithPasskey()).resolves.toEqual({ status: "stale" });
    expect(verify).toHaveLength(0);
    expect(await getToken("accessToken", TENANT_ID)).toBeNull();
  });

  it("never stores a pair the server minted for another tenant", async () => {
    mockRoute("post", LOGIN_OPTIONS, loginOptions);
    mockRoute("post", LOGIN_VERIFY, { ...passkeyLogin, tenant: { tenantId: OTHER_TENANT_ID, name: "Other" } });
    native.get.mockResolvedValue(nativeAssertion as never);
    await expect(signInWithPasskey()).resolves.toEqual({ status: "stale" });
    expect(await getToken("accessToken", OTHER_TENANT_ID)).toBeNull();
    expect(useTenantStore.getState().activeTenantId).toBe(TENANT_ID);
  });

  it("never opens the sheet when the organization changed while the options were loading", async () => {
    mockRoute("post", LOGIN_OPTIONS, () => {
      useTenantStore.getState().setActiveTenantId(OTHER_TENANT_ID);
      return { body: loginOptions };
    });
    const verify = mockRoute("post", LOGIN_VERIFY, passkeyLogin);
    await expect(signInWithPasskey()).resolves.toEqual({ status: "stale" });
    expect(native.get).not.toHaveBeenCalled();
    expect(verify).toHaveLength(0);
  });

  it("drops the answer when someone signed in while the sheet was open", async () => {
    mockRoute("post", LOGIN_OPTIONS, loginOptions);
    const verify = mockRoute("post", LOGIN_VERIFY, passkeyLogin);
    native.get.mockImplementation(async () => {
      useAuthStore.setState({ isAuthenticated: true });
      return nativeAssertion as never;
    });
    await expect(signInWithPasskey()).resolves.toEqual({ status: "stale" });
    expect(verify).toHaveLength(0);
  });

  it("tolerates a null authenticator attachment from the OS", () => {
    expect(toAssertionResponse({ ...nativeAssertion, authenticatorAttachment: null } as never).authenticatorAttachment).toBeUndefined();
    expect(toRegistrationResponse({ ...nativeAttestation, authenticatorAttachment: null } as never).authenticatorAttachment).toBeUndefined();
  });

  it("tells an unknown passkey from an unavailable organization on a usernameless 404", async () => {
    mockRoute("post", LOGIN_OPTIONS, loginOptions);
    native.get.mockResolvedValue(nativeAssertion as never);
    mockRoute("post", LOGIN_VERIFY, () => fail(404, { message: "PASSKEY_NOT_REGISTERED", code: "NOT_FOUND" }));
    await render(<PasskeyButton onSignedIn={jest.fn()} />);
    await fireEvent.press(screen.getByTestId("auth-login-passkey"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This account has no passkey yet."));
  });

  it("says the organization is unavailable when the tenant itself is a 404", async () => {
    mockRoute("post", LOGIN_OPTIONS, () => fail(404, { message: "Tenant not found or inactive" }));
    await render(<PasskeyButton email="ayse@example.com" onSignedIn={jest.fn()} />);
    await fireEvent.press(screen.getByTestId("auth-login-passkey"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This organization is unavailable. Pick another one."));
  });

  it("is unsupported (no request at all) when the native module is missing", async () => {
    modules.Passkey = undefined;
    await expect(signInWithPasskey()).resolves.toEqual({ status: "failed", reason: "unsupported" });
    expect(native.get).not.toHaveBeenCalled();
  });

  it("shows the login button, passes the typed e-mail and hands the result to the screen", async () => {
    mockRoute("post", LOGIN_OPTIONS, loginOptions);
    mockRoute("post", LOGIN_VERIFY, passkeyLogin);
    native.get.mockResolvedValue(nativeAssertion as never);
    const onSignedIn = jest.fn().mockResolvedValue(undefined);
    await render(<PasskeyButton email="ayse@example.com" onSignedIn={onSignedIn} />);
    await fireEvent.press(screen.getByTestId("auth-login-passkey"));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    expect(onSignedIn.mock.calls[0][0]).toMatchObject({ status: "signed-in", otpRequired: false });
  });

  it("toasts a missing passkey and stays signed out", async () => {
    mockRoute("post", LOGIN_OPTIONS, loginOptions);
    native.get.mockRejectedValue({ error: "NoCredentials", message: "none" });
    const onSignedIn = jest.fn();
    await render(<PasskeyButton onSignedIn={onSignedIn} />);
    await fireEvent.press(screen.getByTestId("auth-login-passkey"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No passkey for this account was found on this device."));
    expect(onSignedIn).not.toHaveBeenCalled();
  });
});

describe("register a passkey", () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true, user: safeUserJson as never });
  });

  it("runs bearer options -> sheet -> verify with a typed attestation", async () => {
    const options = mockRoute("get", REGISTER, registrationOptions);
    const verify = mockRoute("post", `${REGISTER}/verify`, { message: "PASSKEY_REGISTERED_SUCCESSFULLY", credentialId: "cred-2" });
    native.create.mockResolvedValue(nativeAttestation as never);

    await expect(registerPasskey()).resolves.toEqual({ status: "registered", credentialId: "cred-2" });

    expect(options[0].headers.authorization).toMatch(/^Bearer /);
    expect(native.create).toHaveBeenCalledWith(expect.objectContaining({ challenge: "chal-reg", rp: { name: "Acme", id: "app.example.test" } }));
    expect(verify[0].body).toMatchObject({ response: { id: "cred-2", rawId: "cred-2", type: "public-key", response: { attestationObject: "ao" } } });
  });

  it("sends nothing when the user dismisses the sheet or the device already has one", async () => {
    mockRoute("get", REGISTER, registrationOptions);
    const verify = mockRoute("post", `${REGISTER}/verify`, {});
    native.create.mockRejectedValueOnce({ error: "UserCancelled", message: "" });
    await expect(registerPasskey()).resolves.toEqual({ status: "cancelled" });
    native.create.mockRejectedValueOnce({ error: "CredentialAlreadyExists", message: "" });
    await expect(registerPasskey()).resolves.toEqual({ status: "failed", reason: "already-exists" });
    expect(verify).toHaveLength(0);
  });

  it("does not send an attestation made for another organization or user", async () => {
    mockRoute("get", REGISTER, registrationOptions);
    const verify = mockRoute("post", `${REGISTER}/verify`, { credentialId: "x" });
    native.create.mockImplementation(async () => {
      useTenantStore.getState().setActiveTenantId(OTHER_TENANT_ID);
      return nativeAttestation as never;
    });
    await expect(registerPasskey()).resolves.toEqual({ status: "stale" });
    expect(verify).toHaveLength(0);
  });

  it("surfaces the server's limit refusal", async () => {
    mockRoute("get", REGISTER, () => fail(409, { message: "PASSKEY_LIMIT_REACHED", code: "CONFLICT" }));
    await expect(registerPasskey()).rejects.toMatchObject({ response: { status: 409 } });
    expect(native.create).not.toHaveBeenCalled();
  });
});

describe("PasskeysCard", () => {
  it("lists passkeys, nudges for a backup when there is exactly one, and adds one", async () => {
    let call = 0;
    mockRoute("get", LIST, () => ({ body: call++ === 0 ? list([passkeyRow("c1", "Pixel")]) : list([passkeyRow("c1", "Pixel"), passkeyRow("c2", "Passkey 2026-10-10")]) }));
    mockRoute("get", REGISTER, registrationOptions);
    mockRoute("post", `${REGISTER}/verify`, { credentialId: "c2" });
    native.create.mockResolvedValue(nativeAttestation as never);
    useAuthStore.setState({ isAuthenticated: true, user: safeUserJson as never });

    await render(<PasskeysCard />);
    expect(await screen.findByText("Pixel")).toBeTruthy();
    expect(screen.getByTestId("passkeys-backup-hint")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("passkeys-add"));
    expect(await screen.findByText("Passkey 2026-10-10")).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith("Passkey added");
    expect(screen.queryByTestId("passkeys-backup-hint")).toBeNull();
  });

  it("removes a passkey after confirmation", async () => {
    let removed = false;
    mockRoute("get", LIST, () => ({ body: list(removed ? [] : [passkeyRow("c1", "Pixel", "2026-10-05T10:00:00.000Z")]) }));
    const del = mockRoute("delete", `${LIST}/:id`, () => {
      removed = true;
      return { body: { message: "PASSKEY_DELETED_SUCCESSFULLY" } };
    });
    await render(<PasskeysCard />);
    await fireEvent.press(await screen.findByTestId("passkey-remove-c1"));
    await fireEvent.press(await screen.findByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(del).toHaveLength(1));
    expect(await screen.findByText("No passkeys yet")).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith("Passkey removed");
  });

  it("renames a passkey", async () => {
    mockRoute("get", LIST, list([passkeyRow("c1", "Pixel"), passkeyRow("c0", "Laptop")]));
    const patch = mockRoute("patch", `${LIST}/:id`, { passkey: passkeyRow("c1", "Work phone") });
    await render(<PasskeysCard />);
    await fireEvent.press(await screen.findByTestId("passkey-rename-c1"));
    await fireEvent.changeText(await screen.findByTestId("passkey-rename-input"), "Work phone");
    await fireEvent.press(screen.getByTestId("passkey-rename-save"));
    await waitFor(() => expect(patch).toHaveLength(1));
    expect(patch[0].body).toEqual({ label: "Work phone" });
    expect(toast.success).toHaveBeenCalledWith("Passkey renamed");
  });

  it("drops a list that arrives after an organization switch", async () => {
    let call = 0;
    mockRoute("get", LIST, () => {
      const n = call++;
      return { body: list([passkeyRow(`c${n}`, n === 0 ? "Old org row" : "New org row")]), init: undefined };
    });
    await render(<PasskeysCard />);
    expect(await screen.findByText("Old org row")).toBeTruthy();
    await act(async () => {
      useTenantStore.getState().setActiveTenantId(OTHER_TENANT_ID);
    });
    expect(await screen.findByText("New org row")).toBeTruthy();
    expect(screen.queryByText("Old org row")).toBeNull();
  });

  it("keeps listing and removing but hides adding where passkeys cannot work", async () => {
    modules.Passkey = undefined;
    mockRoute("get", LIST, list([passkeyRow("c1", "Pixel")]));
    await render(<PasskeysCard />);
    expect(await screen.findByText("Pixel")).toBeTruthy();
    expect(screen.queryByTestId("passkeys-add")).toBeNull();
    expect(screen.getByTestId("passkeys-unavailable")).toBeTruthy();
    expect(screen.getByTestId("passkey-remove-c1")).toBeTruthy();
  });
});
