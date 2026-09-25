import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner-native";
import { DeviceTokenPairSchema } from "@/dto/auth.dto";
import { markHandled, normalizeApiError, type NormalizedApiError } from "@/libs/apiError";
import { env } from "@/libs/env";
import i18n from "@/libs/i18n";
import logger from "@/libs/logger";
import { clearTenantTokens, getToken, setTokens } from "@/libs/secureStorage";
import { useAuthStore } from "@/stores/authStore";
import { getActiveTenantId, useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Axios Instance — next-boilerplate device-bearer transport
//
// - Relative paths are addressed to the active tenant:
//     "/auth/me/sessions" → `${origin}/api/tenant/{tenantId}/auth/me/sessions`
//   (next-boilerplate's proxy rewrites /api/tenant/{id}/… to /tenant/{id}/api/…).
// - `Authorization: Bearer` with that tenant's access token. Never a Cookie
//   header: the server picks the `web` audience whenever an accessToken cookie
//   is present and would then reject the device token.
// - 401s are classified by the server's message string, as next-boilerplate's
//   own client does (the code alone can't tell an expired access token from a
//   dead session — both carry SESSION_EXPIRED):
//     TOKEN_EXPIRED / SESSION_NOT_FOUND / USER_NOT_AUTHENTICATED → refresh + replay
//     SESSION_EXPIRED / SESSION_REVOKED / INVALID_TOKEN / …      → session ended
//     OTP_REQUIRED                                               → OTP gate
// - No navigation here (appshell-compliance): session changes flip store
//   flags and the (auth)/(drawer) layout guards route.
// ============================================================================

declare module "axios" {
  interface AxiosRequestConfig {
    /** Tenant the request is addressed to; defaults to the active tenant. */
    tenantId?: string;
    /** No bearer token and no refresh/session handling (login, refresh, public). */
    skipAuth?: boolean;
    /** Replay of a request after a refresh — never refreshed again. */
    _retry?: boolean;
  }
}

const TENANT_PREFIX = "/api/tenant/";
const REFRESH_PATH = "/auth/device/refresh";

/**
 * A refresh rotates the pair, so requests already in flight with the old
 * access token come back 401 moments later. Replaying them inside this window
 * (instead of refreshing again) avoids a refresh storm that ends in
 * reuse-detection revoking every session — same guard as next-boilerplate.
 */
export const POST_REFRESH_GRACE_MS = 10_000;

const REFRESHABLE = new Set(["TOKEN_EXPIRED", "SESSION_NOT_FOUND", "USER_NOT_AUTHENTICATED"]);
const SESSION_DEAD = new Set(["SESSION_EXPIRED", "SESSION_REVOKED", "INVALID_TOKEN", "REFRESH_TOKEN_REUSED", "DEVICE_FINGERPRINT_MISMATCH"]);
const OTP_CODES = new Set(["OTP_REQUIRED", "TOTP_REQUIRED"]);
// Tenant/membership states that no token refresh can fix (tenant_session messages + ErrorCodes).
const TENANT_UNAVAILABLE_CODES = new Set(["TENANT_NOT_FOUND", "TENANT_INACTIVE", "TENANT_SUSPENDED", "NOT_TENANT_MEMBER"]);
const TENANT_UNAVAILABLE_MESSAGES = new Set([
  "Tenant is inactive",
  "Tenant membership is inactive",
  "Tenant membership is suspended",
  "Tenant membership is pending approval",
  "This session is not valid for this tenant; please switch tenant or sign in again",
]);

export function tenantPath(tenantId: string, path: string): string {
  return `${TENANT_PREFIX}${encodeURIComponent(tenantId)}${path.startsWith("/") ? path : `/${path}`}`;
}

export const axiosInstance = axios.create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ── Request: tenant prefix + bearer ─────────────────────────────────────────

axiosInstance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const url = config.url ?? "";
  if (url.startsWith(TENANT_PREFIX)) {
    // Already addressed (e.g. a replay): recover the tenant from the path.
    config.tenantId ??= decodeURIComponent(url.slice(TENANT_PREFIX.length).split("/")[0]);
  } else if (!/^https?:\/\//i.test(url)) {
    config.tenantId ??= getActiveTenantId();
    config.url = tenantPath(config.tenantId, url);
  }

  if (!config.skipAuth && config.tenantId) {
    const accessToken = await getToken("accessToken", config.tenantId);
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Refresh: single-flight per tenant ───────────────────────────────────────

type RefreshOutcome = "refreshed" | "session-dead" | "failed";
type RefreshState = { inFlight: Promise<RefreshOutcome> | null; lastRefreshAt: number };
const refreshStates = new Map<string, RefreshState>();

function refreshStateFor(tenantId: string): RefreshState {
  let state = refreshStates.get(tenantId);
  if (!state) {
    state = { inFlight: null, lastRefreshAt: 0 };
    refreshStates.set(tenantId, state);
  }
  return state;
}

function refreshTenant(tenantId: string): Promise<RefreshOutcome> {
  const state = refreshStateFor(tenantId);
  if (state.inFlight) return state.inFlight;

  state.inFlight = (async (): Promise<RefreshOutcome> => {
    const refreshToken = await getToken("refreshToken", tenantId);
    if (!refreshToken) return "session-dead";
    try {
      const res = await axiosInstance.post(REFRESH_PATH, { refreshToken }, { tenantId, skipAuth: true });
      const pair = DeviceTokenPairSchema.parse(res.data);
      await setTokens(tenantId, pair); // store BOTH — the old refresh token is now burnt
      state.lastRefreshAt = Date.now();
      return "refreshed";
    } catch (err) {
      const status = (err as AxiosError).response?.status;
      // Only a refusal ends the session; 429 / 5xx / offline say nothing about it.
      if (status === 401 || status === 403) return "session-dead";
      logger.warn("[axios] refresh failed, session kept", status ?? (err as Error).message);
      return "failed";
    } finally {
      state.inFlight = null;
    }
  })();
  return state.inFlight;
}

// ── Session end ─────────────────────────────────────────────────────────────

async function endTenantSession(tenantId: string, noticeKey: string): Promise<void> {
  await clearTenantTokens(tenantId);
  // Another tenant's stored pair died in the background: stay signed in here.
  if (tenantId !== getActiveTenantId()) return;
  const auth = useAuthStore.getState();
  if (!auth.isAuthenticated) return; // already ended by a concurrent request
  auth.logout();
  useTenantStore.getState().flush();
  toast.error(i18n.t(noticeKey));
}

function isTenantUnavailable(e: NormalizedApiError): boolean {
  return (e.code !== undefined && TENANT_UNAVAILABLE_CODES.has(e.code)) || (e.rawMessage !== undefined && TENANT_UNAVAILABLE_MESSAGES.has(e.rawMessage));
}

// ── Response: classify failures ─────────────────────────────────────────────

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;
    const status = error.response?.status;
    // No response (offline, timeout) or an unauthenticated call: nothing to manage.
    if (!config || !status || config.skipAuth) return Promise.reject(error);

    const e = normalizeApiError(error);
    const tenantId = config.tenantId ?? getActiveTenantId();

    if (status === 401 && ((e.rawMessage !== undefined && OTP_CODES.has(e.rawMessage)) || (e.code !== undefined && OTP_CODES.has(e.code)))) {
      useAuthStore.getState().requireOtp(); // session alive, OTP gate closed — no refresh
      return Promise.reject(markHandled(error));
    }

    if ((status === 401 || status === 403 || status === 404) && isTenantUnavailable(e)) {
      await endTenantSession(tenantId, "ERRORS.ORGANIZATION_UNAVAILABLE");
      return Promise.reject(markHandled(error));
    }

    if (status !== 401 || !e.rawMessage) return Promise.reject(error);

    if (SESSION_DEAD.has(e.rawMessage)) {
      await endTenantSession(tenantId, "ERRORS.SESSION_ENDED");
      return Promise.reject(markHandled(error));
    }

    if (!REFRESHABLE.has(e.rawMessage) || config._retry) return Promise.reject(error);

    const state = refreshStateFor(tenantId);
    // A refresh just finished: this request predates the new token — replay it.
    if (!state.inFlight && Date.now() - state.lastRefreshAt < POST_REFRESH_GRACE_MS) {
      return axiosInstance({ ...config, _retry: true });
    }

    const outcome = await refreshTenant(tenantId);
    if (outcome === "refreshed") return axiosInstance({ ...config, _retry: true });
    if (outcome === "session-dead") {
      await endTenantSession(tenantId, "ERRORS.SESSION_ENDED");
      return Promise.reject(markHandled(error));
    }
    return Promise.reject(error);
  },
);

/** Test hook: forget refresh bookkeeping between cases. */
export function resetRefreshStateForTests(): void {
  refreshStates.clear();
}

export default axiosInstance;
