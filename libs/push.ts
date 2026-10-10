import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { z } from "zod";
import { normalizeApiError } from "@/libs/apiError";
import { env } from "@/libs/env";
import i18n from "@/libs/i18n";
import logger from "@/libs/logger";
import { getToken } from "@/libs/secureStorage";
import { PushDataSchema, type PushPlatform } from "@/services/user/push.dto";
import { PushClientService } from "@/services/user/push.service.client";
import { useAuthStore } from "@/stores/authStore";
import { usePushStore } from "@/stores/pushStore";
import { getActiveTenantId, useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Push registration (Phase 8) — Expo push tokens, one registration per organization.
//   - A device token is bound to ONE tenant (K2), so the Expo token is registered for each tenant the device
//     holds a token pair for, when that tenant becomes active (libs/usePushNotifications.ts).
//   - Logout does NOT remove push tokens on the server: `unregisterAllPush()` runs BEFORE the access tokens are
//     cleared (libs/logout.ts, account deletion). It is best effort and capped in time, so offline never blocks it.
//   - Like libs/realtime.ts, an answer that arrives after a sign-out never lands: every registration is serialized
//     behind a queue, and `unregisterAllPush()` bumps an epoch so queued or in-flight work gives up.
//   - No push token is ever logged, stored or put in a URL.
// ============================================================================

export type PushPermission = "granted" | "denied" | "undetermined" | "unsupported";

export type PushRegistrationResult =
  | "registered"
  | "unsupported" // web, simulator, or no native module
  | "disabled" // the device switch is off
  | "signed-out"
  | "permission-denied"
  | "permission-undetermined"
  | "no-project-id"
  | "stale" // a sign-out happened while the registration was queued or in flight
  | "failed";

/** The Android channel notifications are posted to. Created before the permission prompt (Android 13+). */
export const ANDROID_CHANNEL_ID = "default";
/** Longest a sign-out waits for the server to forget this device. */
export const UNREGISTER_CAP_MS = 8_000;
const UNREGISTER_REQUEST_TIMEOUT_MS = 4_000;

let epoch = 0;
let chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job);
  chain = run.catch(() => undefined);
  return run;
}

/** Remote push needs a physical device on iOS or Android (and a development build; Expo Go cannot receive it). */
export function pushSupported(): boolean {
  return (Platform.OS === "ios" || Platform.OS === "android") && Device.isDevice;
}

/** EAS project id: `EXPO_PUBLIC_EAS_PROJECT_ID` (libs/env), else app.config `extra.eas.projectId`. Must be a UUID. */
export function resolveProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined;
  const candidate = env.EXPO_PUBLIC_EAS_PROJECT_ID ?? extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const parsed = z.string().uuid().safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function toPermission(status: string, granted: boolean): PushPermission {
  if (granted || status === "granted") return "granted";
  return status === "undetermined" ? "undetermined" : "denied";
}

export async function getPushPermission(): Promise<PushPermission> {
  if (!pushSupported()) return "unsupported";
  try {
    const p = await Notifications.getPermissionsAsync();
    return toPermission(p.status, p.granted);
  } catch (err) {
    logger.warn("[push] permission read failed", err instanceof Error ? err.message : "unknown");
    return "unsupported";
  }
}

/** Shows the OS prompt. Call it only from the pre-prompt or an explicit switch, never at launch. */
export async function requestPushPermission(): Promise<PushPermission> {
  if (!pushSupported()) return "unsupported";
  try {
    await ensureAndroidChannel();
    const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    return toPermission(p.status, p.granted);
  } catch (err) {
    logger.warn("[push] permission request failed", err instanceof Error ? err.message : "unknown");
    return "denied";
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: i18n.t("PUSH.CHANNEL_NAME"),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

const signedIn = () => {
  const auth = useAuthStore.getState();
  return auth.isAuthenticated && !auth.otpRequired;
};

/**
 * Registers this device's Expo token for `tenantId` (idempotent on the server; a token already on that tenant
 * under another account is re-bound to this one). Never prompts: without a granted permission it just says so.
 */
export function registerPushForTenant(tenantId: string): Promise<PushRegistrationResult> {
  const myEpoch = epoch;
  return enqueue(async (): Promise<PushRegistrationResult> => {
    const gone = () => myEpoch !== epoch || !signedIn();
    try {
      if (!pushSupported()) return "unsupported";
      const store = usePushStore.getState();
      if (!store.enabled) return "disabled";
      if (myEpoch !== epoch) return "stale";
      if (!signedIn()) return "signed-out";
      if (!(await getToken("accessToken", tenantId))) return "signed-out"; // no pair for that organization

      const permission = await getPushPermission();
      if (permission === "denied") return "permission-denied";
      if (permission !== "granted") return "permission-undetermined";

      const projectId = resolveProjectId();
      if (!projectId) {
        logger.warn("[push] no EAS project id: set EXPO_PUBLIC_EAS_PROJECT_ID");
        return "no-project-id";
      }

      await ensureAndroidChannel();
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (gone()) return "stale";

      await PushClientService.register(tenantId, {
        provider: "expo",
        token,
        platform: (Platform.OS === "ios" ? "ios" : "android") satisfies PushPlatform,
        deviceId: usePushStore.getState().ensureDeviceId(),
        appVersion: env.EXPO_PUBLIC_APP_VERSION.slice(0, 40),
      });
      if (myEpoch !== epoch) return "stale"; // signed out meanwhile: unregisterAllPush already cleared the books
      usePushStore.getState().markRegistered(tenantId);
      return "registered";
    } catch (err) {
      logger.warn("[push] registration failed", normalizeApiError(err).statusCode ?? (err instanceof Error ? err.name : "unknown"));
      return "failed";
    }
  });
}

/** Registers for the ACTIVE organization. */
export function registerPushForActiveTenant(): Promise<PushRegistrationResult> {
  return registerPushForTenant(getActiveTenantId());
}

/**
 * Registers for the ACTIVE organization first, then for every other one this device holds a session for (used after
 * the device switch is turned on, and when a refused account deletion put the tokens back). Resolves with the
 * ACTIVE organization's outcome; the others are best effort.
 */
export async function registerPushForAllTenants(): Promise<PushRegistrationResult> {
  const active = getActiveTenantId();
  const others = useTenantStore.getState().knownTenantIds.filter((id) => id !== active);
  const [result] = await Promise.all([registerPushForTenant(active), ...others.map((id) => registerPushForTenant(id))]);
  return result;
}

/**
 * Asks the server to forget this device in every organization it holds a session for. Call it BEFORE the access
 * tokens are cleared (sign-out) or the sessions are revoked (account deletion): the request needs the bearer token.
 *
 * Never throws and never waits longer than UNREGISTER_CAP_MS: offline, a dead session or a server error is logged
 * and the caller carries on (the server prunes tokens Expo reports as unregistered; a phone that changes hands
 * is re-bound on the next sign-in). The local registration books are cleared either way.
 */
export async function unregisterAllPush(): Promise<void> {
  epoch += 1; // queued and in-flight registrations give up
  const store = usePushStore.getState();
  const deviceId = store.deviceId;
  if (!deviceId) return; // this install never registered anything

  const tenantIds = [...new Set([getActiveTenantId(), ...useTenantStore.getState().knownTenantIds, ...Object.keys(store.registered)])];
  const work = enqueue(async () => {
    const results = await Promise.allSettled(
      tenantIds.map(async (tenantId) => {
        if (!(await getToken("accessToken", tenantId))) return; // nothing to authenticate with
        await PushClientService.unregister(tenantId, { deviceId }, UNREGISTER_REQUEST_TIMEOUT_MS);
      }),
    );
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    if (failed.length > 0) logger.warn("[push] unregister failed for some organizations", failed.map((r) => normalizeApiError(r.reason).statusCode ?? "no response"));
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, UNREGISTER_CAP_MS);
  });
  try {
    await Promise.race([work.catch(() => undefined), cap]);
  } finally {
    clearTimeout(timer);
    usePushStore.getState().clearRegistrations();
  }
}

// ── Notification payload → screen ───────────────────────────────────────────

export type PushTarget = { kind: "conversation"; conversationId: string } | { kind: "notifications" };

const WEB_THREAD_RE = /^\/messaging\/([A-Za-z0-9_-]{1,128})\/?(?:[?#].*)?$/;

/**
 * Where a push opens. The server sends `data.conversationId` for a message and a WEB path in `data.url`
 * (`/messaging/{id}`), never an app route, so only known shapes are mapped; anything else opens the notifications
 * list. A payload can never navigate to an arbitrary path.
 */
export function pushTargetFor(data: unknown): PushTarget {
  const parsed = PushDataSchema.safeParse(data);
  if (!parsed.success) return { kind: "notifications" };
  const { conversationId, url } = parsed.data;
  if (conversationId) return { kind: "conversation", conversationId };
  const fromUrl = url ? WEB_THREAD_RE.exec(url)?.[1] : undefined;
  return fromUrl ? { kind: "conversation", conversationId: fromUrl } : { kind: "notifications" };
}
