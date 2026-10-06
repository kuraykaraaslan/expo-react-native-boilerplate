import { http, HttpResponse, type HttpResponseInit } from "msw";
import { setTokens } from "@/libs/secureStorage";
import { resetRefreshStateForTests } from "@/libs/axios";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { server } from "./_server";
import { SESSION_ID, TENANT_ID, USER_ID, makeJwt } from "./fixtures";

export const API_ORIGIN = "http://api.test";

export type Seen = {
  method: string;
  /** Path after /api/tenant/{tenantId}, e.g. "/auth/me/sessions". */
  path: string;
  tenantId: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
};

/**
 * Answers `method` on `…/api/tenant/:tenantId{path}` and records each request.
 * `respond` may be a body or a function returning one (per-call answers).
 */
export function mockRoute(
  method: "get" | "post" | "put" | "delete",
  path: string,
  respond: unknown | ((call: number) => { body?: unknown; init?: HttpResponseInit }),
) {
  const requests: Seen[] = [];
  server.use(
    http[method](`${API_ORIGIN}/api/tenant/:tenantId${path}`, async ({ request, params }) => {
      const url = new URL(request.url);
      const text = method === "get" || method === "delete" ? "" : await request.text();
      requests.push({
        method: request.method,
        path: url.pathname.replace(/^\/api\/tenant\/[^/]+/, ""),
        tenantId: String(params.tenantId),
        query: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(request.headers),
        body: text ? JSON.parse(text) : undefined,
      });
      const out = typeof respond === "function" ? (respond as (n: number) => { body?: unknown; init?: HttpResponseInit })(requests.length) : { body: respond };
      return HttpResponse.json((out.body ?? {}) as Record<string, unknown>, out.init);
    }),
  );
  return requests;
}

/** An error answer in one of the server's body shapes. */
export const fail = (status: number, body: unknown, headers?: Record<string, string>) => ({ body, init: { status, headers } });

/** Device holds a live session for `tenantId` (tokens stored, tenant active, user signed in). */
export async function signIn(tenantId: string = TENANT_ID) {
  resetRefreshStateForTests();
  useTenantStore.setState({ activeTenantId: tenantId, knownTenantIds: [], selectedTenantMembership: null, memberships: [] });
  useAuthStore.setState({ isAuthenticated: true, user: null, otpRequired: false });
  await setTokens(tenantId, {
    accessToken: makeJwt({ userId: USER_ID, userSessionId: SESSION_ID, tenantId }),
    refreshToken: `refresh-${tenantId}`,
  });
}
