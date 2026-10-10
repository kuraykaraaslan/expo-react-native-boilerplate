import { NativeModules, Platform } from "react-native";
import { Passkey as NativePasskey } from "react-native-passkey";
import type { PasskeyCreateResult, PasskeyGetResult } from "react-native-passkey";
import { getDeviceInfo } from "@/libs/deviceInfo";
import { env } from "@/libs/env";
import logger from "@/libs/logger";
import { startDeviceSession } from "@/libs/session";
import type { DeviceLoginResponse } from "@/services/auth/auth.dto";
import {
  PasskeyAssertionResponseSchema,
  PasskeyRegistrationResponseSchema,
  type PasskeyAssertionResponse,
  type PasskeyLoginOptions,
  type PasskeyRegistrationOptions,
  type PasskeyRegistrationResponse,
} from "@/services/auth/passkey.dto";
import { PasskeyClientService } from "@/services/auth/passkey.service.client";
import { useAuthStore } from "@/stores/authStore";
import { getActiveTenantId } from "@/stores/tenantStore";

// ============================================================================
// Passkeys (Phase 11) on top of react-native-passkey (a native module: needs a development build, never Expo Go).
//   - Sign in: device passkey login options -> OS sheet -> device passkey login verify. The answer is the body
//     of /auth/device/login, so it goes through the SAME completion as a password login (libs/session
//     startDeviceSession: the pair lands in SecureStore for that tenant, K2). Nothing parses cookies.
//   - Register: bearer-authenticated options -> OS sheet -> verify.
//   - Like libs/realtime.ts, an answer that arrives after the organization or the user changed never lands.
//   - Challenges, assertions, credential ids and tokens are never logged.
// ============================================================================

export type PasskeyFailure =
  | "cancelled" // the user dismissed the sheet: say nothing
  | "no-credentials" // no passkey for this account on this device
  | "already-exists" // this device already holds one for this account
  | "misconfigured" // the OS refused the relying-party binding (associated domain / asset links)
  | "unsupported"
  | "failed";

/**
 * Passkeys can be used: iOS or Android (not web), the native module is linked in this build (it is not in Expo
 * Go), the OS is new enough (iOS 15 / Android 9), and the owner supplied the relying-party domain
 * (EXPO_PUBLIC_PASSKEY_RP_ID) the associated-domain files are published on. Everything that would offer passkeys
 * (login button, "Add a passkey") hides itself when this is false.
 */
export function passkeysAvailable(): boolean {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  if (!env.EXPO_PUBLIC_PASSKEY_RP_ID) return false;
  try {
    // react-native-passkey swaps a throwing proxy in when it is not linked: test the registry, never call it.
    if (!NativeModules.Passkey) return false;
    return NativePasskey.isSupported();
  } catch {
    return false;
  }
}

/** react-native-passkey rejects with a plain `{ error, message }` object, not an Error. */
function nativeErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && typeof (err as { error?: unknown }).error === "string") return (err as { error: string }).error;
  return null;
}

/** null when the failure is not a native passkey one (an HTTP error, a parse error): the caller reports it as an API error. */
export function classifyPasskeyError(err: unknown): PasskeyFailure | null {
  const code = nativeErrorCode(err);
  switch (code) {
    case null:
      return null;
    case "UserCancelled":
    case "Interrupted":
      return "cancelled";
    case "NoCredentials":
    case "NoCreateOption":
      return "no-credentials";
    case "CredentialAlreadyExists":
      return "already-exists";
    case "BadConfiguration":
      return "misconfigured";
    case "NotSupported":
      return "unsupported";
    default:
      return "failed";
  }
}

/** Technical detail for the log only: the code, never the (possibly credential-bearing) message. */
export function describePasskeyError(err: unknown): string {
  return nativeErrorCode(err) ?? (err instanceof Error ? err.name : "unknown");
}

// ── WebAuthn JSON <-> react-native-passkey ───────────────────────────────────

const toDescriptors = (list?: { id: string; transports?: string[] }[]) =>
  list?.map((c) => ({ type: "public-key" as const, id: c.id, transports: c.transports as never }));

export function toNativeCreateRequest(o: PasskeyRegistrationOptions): Parameters<typeof NativePasskey.create>[0] {
  return {
    challenge: o.challenge,
    rp: o.rp,
    user: o.user,
    pubKeyCredParams: o.pubKeyCredParams,
    timeout: o.timeout,
    excludeCredentials: toDescriptors(o.excludeCredentials),
    authenticatorSelection: o.authenticatorSelection,
    attestation: o.attestation,
  };
}

export function toNativeGetRequest(o: PasskeyLoginOptions): Parameters<typeof NativePasskey.get>[0] {
  return {
    challenge: o.challenge,
    rpId: o.rpId,
    timeout: o.timeout,
    allowCredentials: toDescriptors(o.allowCredentials),
    userVerification: o.userVerification,
  };
}

/** The server's verifier insists on `type: 'public-key'`, which the native result may omit. */
export function toRegistrationResponse(r: PasskeyCreateResult): PasskeyRegistrationResponse {
  return PasskeyRegistrationResponseSchema.parse({
    id: r.id,
    rawId: r.rawId ?? r.id,
    type: "public-key",
    authenticatorAttachment: r.authenticatorAttachment || undefined, // some OS versions report null
    clientExtensionResults: {},
    response: {
      clientDataJSON: r.response.clientDataJSON,
      attestationObject: r.response.attestationObject,
      authenticatorData: r.response.authenticatorData,
      transports: r.response.transports,
      publicKeyAlgorithm: r.response.publicKeyAlgorithm,
      publicKey: r.response.publicKey,
    },
  });
}

export function toAssertionResponse(r: PasskeyGetResult): PasskeyAssertionResponse {
  return PasskeyAssertionResponseSchema.parse({
    id: r.id,
    rawId: r.rawId ?? r.id,
    type: "public-key",
    authenticatorAttachment: r.authenticatorAttachment || undefined, // some OS versions report null
    clientExtensionResults: {},
    response: {
      clientDataJSON: r.response.clientDataJSON,
      authenticatorData: r.response.authenticatorData,
      signature: r.response.signature,
      userHandle: r.response.userHandle || undefined,
    },
  });
}

function warnOnRpMismatch(serverRpId: string) {
  const configured = env.EXPO_PUBLIC_PASSKEY_RP_ID;
  if (configured && configured.toLowerCase() !== serverRpId.toLowerCase()) {
    logger.warn("[passkey] the server's RP ID differs from EXPO_PUBLIC_PASSKEY_RP_ID; the OS will refuse the ceremony", serverRpId, configured);
  }
}

// ── Sign in ───────────────────────────────────────────────────────────────────

export type PasskeySignInResult =
  | { status: "signed-in"; login: DeviceLoginResponse; otpRequired: boolean; mustChangePassword: boolean }
  | { status: "cancelled" }
  /** The organization changed, or someone signed in, while the sheet was open: nothing was stored. */
  | { status: "stale" }
  | { status: "failed"; reason: PasskeyFailure };

let signInBusy = false;

/**
 * Signs in with a passkey for the active organization. With an `email` the server limits the sheet to that user's
 * credentials; without it a usernameless (discoverable) challenge is used. Server errors (404, 403, 400, 429) are
 * thrown for the caller's `handleApiError`; OS-side failures come back as `failed`/`cancelled`.
 */
export async function signInWithPasskey(email?: string): Promise<PasskeySignInResult> {
  if (!passkeysAvailable()) return { status: "failed", reason: "unsupported" };
  if (signInBusy) return { status: "cancelled" };
  signInBusy = true;
  const tenantId = getActiveTenantId();
  const current = () => getActiveTenantId() === tenantId && !useAuthStore.getState().isAuthenticated;
  try {
    const options = await PasskeyClientService.loginOptions(email, tenantId);
    // Never open the OS sheet for an organization the user already left, or after someone signed in.
    if (!current()) return { status: "stale" };
    warnOnRpMismatch(options.rpId);
    let assertion: PasskeyAssertionResponse;
    try {
      assertion = toAssertionResponse(await NativePasskey.get(toNativeGetRequest(options)));
    } catch (err) {
      const reason = classifyPasskeyError(err);
      if (!reason) throw err;
      if (reason !== "cancelled") logger.warn("[passkey] sign-in ceremony failed", describePasskeyError(err));
      return reason === "cancelled" ? { status: "cancelled" } : { status: "failed", reason };
    }
    if (!current()) return { status: "stale" };

    const login = await PasskeyClientService.loginVerify({ response: assertion, email, device: getDeviceInfo() }, tenantId);
    // The pair is minted for the tenant we asked: never store it under another one, or for a changed user.
    if (!current() || login.tenant.tenantId !== tenantId) return { status: "stale" };
    const { otpRequired, mustChangePassword } = await startDeviceSession(login);
    return { status: "signed-in", login, otpRequired, mustChangePassword };
  } finally {
    signInBusy = false;
  }
}

// ── Register ──────────────────────────────────────────────────────────────────

export type PasskeyRegisterResult =
  | { status: "registered"; credentialId: string }
  | { status: "cancelled" }
  /** The organization or the user changed while the sheet was open: nothing was sent. */
  | { status: "stale" }
  | { status: "failed"; reason: PasskeyFailure };

let registerBusy = false;

/** Registers a passkey for the signed-in user on this device. `label` is optional (the server dates one if absent). */
export async function registerPasskey(label?: string): Promise<PasskeyRegisterResult> {
  if (!passkeysAvailable()) return { status: "failed", reason: "unsupported" };
  if (registerBusy) return { status: "cancelled" };
  registerBusy = true;
  const tenantId = getActiveTenantId();
  const userId = useAuthStore.getState().user?.userId ?? null;
  const current = () => getActiveTenantId() === tenantId && useAuthStore.getState().isAuthenticated && (useAuthStore.getState().user?.userId ?? null) === userId;
  try {
    const options = await PasskeyClientService.registrationOptions();
    if (!current()) return { status: "stale" };
    warnOnRpMismatch(options.rp.id);
    let attestation: PasskeyRegistrationResponse;
    try {
      attestation = toRegistrationResponse(await NativePasskey.create(toNativeCreateRequest(options)));
    } catch (err) {
      const reason = classifyPasskeyError(err);
      if (!reason) throw err;
      if (reason !== "cancelled") logger.warn("[passkey] registration ceremony failed", describePasskeyError(err));
      return reason === "cancelled" ? { status: "cancelled" } : { status: "failed", reason };
    }
    if (!current()) return { status: "stale" };
    const credentialId = await PasskeyClientService.registerVerify({ response: attestation, label: label?.trim() || undefined });
    return { status: "registered", credentialId };
  } finally {
    registerBusy = false;
  }
}
