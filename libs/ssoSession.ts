import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import axiosInstance from "@/libs/axios";
import logger from "@/libs/logger";
import { setTokens } from "@/libs/secureStorage";
import { SafeUserSchema, SessionResponseSchema } from "@/services/auth/auth.dto";
import type { SSOProvider } from "@/services/auth/sso.dto";
import { SSOClientService } from "@/services/auth/sso.service.client";
import { useAuthStore } from "@/stores/authStore";
import { useSSOStore } from "@/stores/ssoStore";
import { useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// SSO browser flow (phase 6).
//
// K4: today the server's OAuth callback mints a `web`-audience token and
// redirects to a web URL, so a device cannot finish the flow. Everything here is
// written for the day it does (redirect to <scheme>://auth/callback with
// rawAccessToken / rawRefreshToken / state), and until then it fails SAFE: a
// token is verified before it is stored, so a web-audience token is never kept.
// ============================================================================

export type SSOOutcome =
  | "signed-in"
  /** The user closed the browser — nothing to report. */
  | "cancelled"
  /** The returned `state` is not the one we sent. */
  | "state-mismatch"
  /** The server cannot complete a device SSO login (K4) — tell the user to use e-mail. */
  | "unavailable";

/** How long to wait for an app redirect before giving up on a browser stuck on a web page. */
export const SSO_REDIRECT_TIMEOUT_MS = 3 * 60 * 1000;

const REDIRECT_PATH = "/auth/callback";

type CallbackParams = { state?: string; accessToken?: string; refreshToken?: string };

function parseCallback(url: string): CallbackParams {
  const { queryParams } = Linking.parse(url);
  const pick = (key: string) => (typeof queryParams?.[key] === "string" ? (queryParams[key] as string) : undefined);
  return { state: pick("state"), accessToken: pick("rawAccessToken"), refreshToken: pick("rawRefreshToken") };
}

/** The OAuth `state` is `{tenantId}.{uuid}` — the tenant half says whose session this is. */
export function tenantFromState(state: string): string | null {
  const dot = state.indexOf(".");
  return dot > 0 ? state.slice(0, dot) : null;
}

/** Proves the returned token works as a bearer for that tenant, without storing it. */
async function verifyBearer(tenantId: string, accessToken: string) {
  const res = await axiosInstance.get("/auth/session", { tenantId, skipAuth: true, headers: { Authorization: `Bearer ${accessToken}` } });
  return SessionResponseSchema.parse(res.data);
}

async function openBrowser(url: string, redirectUrl: string): Promise<WebBrowser.WebBrowserAuthSessionResult | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), SSO_REDIRECT_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([WebBrowser.openAuthSessionAsync(url, redirectUrl), timeout]);
    if (result === "timeout") WebBrowser.dismissAuthSession();
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function signInWithProvider(provider: SSOProvider): Promise<SSOOutcome> {
  const { url, state } = await SSOClientService.getAuthUrl(provider);
  useSSOStore.getState().setPendingState(state);
  const redirectUrl = Linking.createURL(REDIRECT_PATH);

  const result = await openBrowser(url, redirectUrl);
  if (result === "timeout") {
    useSSOStore.getState().setPendingState(null);
    logger.error("SSO browser never redirected back to the app (web redirect) - see phases/auth_sso/README.md");
    return "unavailable";
  }
  if (result.type !== "success") {
    useSSOStore.getState().setPendingState(null);
    return "cancelled"; // cancel / dismiss / locked: the user walked away, no error
  }

  const expected = useSSOStore.getState().pendingState;
  useSSOStore.getState().setPendingState(null); // single use
  const returned = parseCallback(result.url);
  if (!expected || returned.state !== expected) return "state-mismatch";

  const tenantId = tenantFromState(expected);
  if (!tenantId || !returned.accessToken || !returned.refreshToken) {
    logger.error("SSO callback carried no device tokens - device bearer flow requires server-side `audience: 'device'`; see phases/auth_sso/README.md");
    return "unavailable";
  }

  try {
    const session = await verifyBearer(tenantId, returned.accessToken);
    await setTokens(tenantId, { accessToken: returned.accessToken, refreshToken: returned.refreshToken });
    useTenantStore.getState().setActiveTenantId(tenantId);
    useAuthStore.getState().setUser(SafeUserSchema.parse(session.user));
    return "signed-in";
  } catch (err) {
    // Today: the callback produced a web-audience token, which the bearer path refuses (401). Nothing was stored.
    logger.error("SSO callback returned a token the device bearer path rejects (web audience?) - see phases/auth_sso/README.md", err instanceof Error ? err.message : "");
    return "unavailable";
  }
}
