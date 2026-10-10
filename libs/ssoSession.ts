import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { normalizeApiError } from "@/libs/apiError";
import axiosInstance from "@/libs/axios";
import logger from "@/libs/logger";
import { applyCompliance } from "@/libs/pendingAgreements";
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
// K4 (resolved server-side, contract-checked 2026-10-10 against next-boilerplate
// sso-provider.route.ts + app/api/auth/callback/[provider]/route.ts): the app sends its
// deep link as `redirect_uri` (exact match against SSO_DEVICE_REDIRECT_URIS, else 400);
// the callback then mints a `device`-audience pair and redirects to
// <redirect_uri>?rawAccessToken&rawRefreshToken&state, or <redirect_uri>?error=<message>&state.
// Against a server without that change the callback still yields a web-audience
// token, so the flow keeps failing SAFE: a token is verified before it is stored.
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

type CallbackParams = { state?: string; accessToken?: string; refreshToken?: string; error?: string };

function parseCallback(url: string): CallbackParams {
  const { queryParams } = Linking.parse(url);
  const pick = (key: string) => (typeof queryParams?.[key] === "string" ? (queryParams[key] as string) : undefined);
  return { state: pick("state"), accessToken: pick("rawAccessToken"), refreshToken: pick("rawRefreshToken"), error: pick("error") };
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
  const redirectUrl = Linking.createURL(REDIRECT_PATH);
  let started: Awaited<ReturnType<typeof SSOClientService.getAuthUrl>>;
  try {
    started = await SSOClientService.getAuthUrl(provider, redirectUrl);
  } catch (err) {
    // 400 = the provider is off for this tenant OR `redirect_uri` is not in the server's SSO_DEVICE_REDIRECT_URIS.
    // The redirect value is not a secret and is exactly what the owner has to list there.
    if (normalizeApiError(err).statusCode === 400) {
      logger.error(`SSO start refused (400): list this exact value in the server's SSO_DEVICE_REDIRECT_URIS - redirect_uri=${redirectUrl}`);
      return "unavailable";
    }
    throw err;
  }
  const { url, state } = started;
  useSSOStore.getState().setPendingState(state);

  const result = await openBrowser(url, redirectUrl);
  if (result === "timeout") {
    useSSOStore.getState().setPendingState(null);
    logger.error("SSO browser never redirected back to the app (web redirect) - see docs/phases/06-auth-sso/README.md");
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

  if (returned.error) {
    // The server redirected with `?error=<message>&state` (provider refused, account blocked, ...). No tokens came with it.
    logger.warn("SSO callback reported an error", returned.error);
    return "unavailable";
  }

  const tenantId = tenantFromState(expected);
  if (!tenantId || !returned.accessToken || !returned.refreshToken) {
    logger.error("SSO callback carried no device tokens - device bearer flow requires server-side `audience: 'device'`; see docs/phases/06-auth-sso/README.md");
    return "unavailable";
  }

  try {
    const session = await verifyBearer(tenantId, returned.accessToken);
    await setTokens(tenantId, { accessToken: returned.accessToken, refreshToken: returned.refreshToken });
    useTenantStore.getState().setActiveTenantId(tenantId);
    useAuthStore.getState().setUser(SafeUserSchema.parse(session.user)); // slim user: the profile loads on demand
    useAuthStore.getState().clearPasswordChange(); // same reset a password login does (the OTP gate is skipped server side)
    applyCompliance(tenantId, session.compliance);
    return "signed-in";
  } catch (err) {
    // Today: the callback produced a web-audience token, which the bearer path refuses (401). Nothing was stored.
    logger.error("SSO callback returned a token the device bearer path rejects (web audience?) - see docs/phases/06-auth-sso/README.md", err instanceof Error ? err.message : "");
    return "unavailable";
  }
}
