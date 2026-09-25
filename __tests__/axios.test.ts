import { http, HttpResponse, delay } from "msw";
import { isHandled } from "@/libs/apiError";
import { axiosInstance, resetRefreshStateForTests } from "@/libs/axios";
import { getToken, setTokens } from "@/libs/secureStorage";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { server } from "./_server";

jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

const TENANT = "tenant-a";
const API = `http://api.test/api/tenant/${TENANT}`;
const user = { userId: "u1", email: "u@example.com", userRole: "USER" as const };

function unauthorized(message: string, code = "UNAUTHORIZED") {
  return HttpResponse.json({ message, code }, { status: 401 });
}

/** Refresh endpoint that rotates A1/R1 → A2/R2 and counts calls. */
function refreshHandler(counter: { calls: number }, respond?: () => Response | Promise<Response>) {
  return http.post(`${API}/auth/device/refresh`, async ({ request }) => {
    counter.calls += 1;
    if (respond) return respond();
    const body = (await request.json()) as { refreshToken?: string };
    if (body.refreshToken !== "R1") return unauthorized("REFRESH_TOKEN_REUSED");
    await delay(20);
    return HttpResponse.json({ message: "TOKENS_REFRESHED_SUCCESSFULLY", accessToken: "A2", refreshToken: "R2" });
  });
}

beforeEach(async () => {
  resetRefreshStateForTests();
  useTenantStore.setState({ activeTenantId: TENANT, knownTenantIds: [], selectedTenantMembership: null, memberships: [] });
  useAuthStore.setState({ isAuthenticated: true, user, otpRequired: false });
  await setTokens(TENANT, { accessToken: "A1", refreshToken: "R1" });
});

describe("request addressing", () => {
  it("prefixes the active tenant, sends the bearer token and never a Cookie", async () => {
    let seen: { path: string; auth: string | null; cookie: string | null; csrf: string | null } | null = null;
    server.use(
      http.get(`${API}/auth/me`, ({ request }) => {
        seen = {
          path: new URL(request.url).pathname,
          auth: request.headers.get("authorization"),
          cookie: request.headers.get("cookie"),
          csrf: request.headers.get("x-csrf-token"),
        };
        return HttpResponse.json({ ok: true });
      }),
    );

    await axiosInstance.get("/auth/me");

    expect(seen).toEqual({ path: `/api/tenant/${TENANT}/auth/me`, auth: "Bearer A1", cookie: null, csrf: null });
  });

  it("falls back to the default tenant when none is active (never /tenant/undefined)", async () => {
    useTenantStore.setState({ activeTenantId: null });
    let path = "";
    server.use(
      http.get("http://api.test/api/tenant/:tenantId/ping", ({ request }) => {
        path = new URL(request.url).pathname;
        return HttpResponse.json({});
      }),
    );
    await axiosInstance.get("/ping");
    expect(path).toBe("/api/tenant/tenant-default/ping");
  });
});

describe("token refresh", () => {
  it("five concurrent requests with an expired token trigger ONE refresh and all succeed", async () => {
    const refresh = { calls: 0 };
    server.use(
      refreshHandler(refresh),
      http.get(`${API}/items/:id`, ({ request, params }) =>
        request.headers.get("authorization") === "Bearer A2"
          ? HttpResponse.json({ id: params.id })
          : unauthorized("TOKEN_EXPIRED", "SESSION_EXPIRED"),
      ),
    );

    const results = await Promise.all([1, 2, 3, 4, 5].map((id) => axiosInstance.get(`/items/${id}`)));

    expect(refresh.calls).toBe(1);
    expect(results.map((r) => r.data.id)).toEqual(["1", "2", "3", "4", "5"]);
    // Both rotated tokens are stored — keeping R1 would trip reuse detection.
    expect(await getToken("accessToken", TENANT)).toBe("A2");
    expect(await getToken("refreshToken", TENANT)).toBe("R2");
  });

  it("a 401 arriving just after a refresh is replayed without refreshing again", async () => {
    const refresh = { calls: 0 };
    let lateCalls = 0;
    server.use(
      refreshHandler(refresh),
      http.get(`${API}/first`, ({ request }) =>
        request.headers.get("authorization") === "Bearer A2" ? HttpResponse.json({}) : unauthorized("TOKEN_EXPIRED", "SESSION_EXPIRED"),
      ),
      // Simulates a request that left with the old token before the refresh landed.
      http.get(`${API}/late`, () => (++lateCalls === 1 ? unauthorized("SESSION_NOT_FOUND") : HttpResponse.json({ ok: true }))),
    );

    await axiosInstance.get("/first");
    const late = await axiosInstance.get("/late");

    expect(late.data).toEqual({ ok: true });
    expect(refresh.calls).toBe(1);
  });

  it("refresh refused (401) ends the session: tokens cleared, signed out, error marked handled", async () => {
    const refresh = { calls: 0 };
    server.use(
      refreshHandler(refresh, () => unauthorized("SESSION_EXPIRED", "SESSION_EXPIRED")),
      http.get(`${API}/data`, () => unauthorized("TOKEN_EXPIRED", "SESSION_EXPIRED")),
    );

    const err = await axiosInstance.get("/data").catch((e: unknown) => e);

    expect(isHandled(err)).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(await getToken("refreshToken", TENANT)).toBeNull();
  });

  it("refresh rate-limited (429) keeps the session — only a refusal is fatal", async () => {
    const refresh = { calls: 0 };
    server.use(
      refreshHandler(refresh, () => HttpResponse.json({ message: "Too many requests" }, { status: 429, headers: { "Retry-After": "30" } })),
      http.get(`${API}/data`, () => unauthorized("TOKEN_EXPIRED", "SESSION_EXPIRED")),
    );

    const err = await axiosInstance.get("/data").catch((e: unknown) => e);

    expect(isHandled(err)).toBe(false); // the screen shows its own error
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(await getToken("refreshToken", TENANT)).toBe("R1");
  });
});

describe("terminal states", () => {
  it("SESSION_EXPIRED is a dead session: no refresh attempt, signed out", async () => {
    const refresh = { calls: 0 };
    server.use(refreshHandler(refresh), http.get(`${API}/data`, () => unauthorized("SESSION_EXPIRED", "SESSION_EXPIRED")));

    await axiosInstance.get("/data").catch(() => undefined);

    expect(refresh.calls).toBe(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(await getToken("accessToken", TENANT)).toBeNull();
  });

  it("OTP_REQUIRED flags the OTP gate and does not refresh", async () => {
    const refresh = { calls: 0 };
    server.use(refreshHandler(refresh), http.get(`${API}/data`, () => unauthorized("OTP_REQUIRED", "OTP_REQUIRED")));

    const err = await axiosInstance.get("/data").catch((e: unknown) => e);

    expect(refresh.calls).toBe(0);
    expect(useAuthStore.getState().otpRequired).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(isHandled(err)).toBe(true);
  });

  it("losing the membership ends the tenant session", async () => {
    server.use(
      http.get(`${API}/data`, () =>
        HttpResponse.json({ message: "User is not a member of this tenant", code: "NOT_TENANT_MEMBER" }, { status: 403 }),
      ),
    );

    await axiosInstance.get("/data").catch(() => undefined);

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(await getToken("accessToken", TENANT)).toBeNull();
  });

  it("a plain 403 (missing permission) leaves the session alone", async () => {
    server.use(
      http.get(`${API}/data`, () =>
        HttpResponse.json({ message: "Insufficient permissions for this tenant operation", code: "FORBIDDEN" }, { status: 403 }),
      ),
    );

    await axiosInstance.get("/data").catch(() => undefined);

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(await getToken("accessToken", TENANT)).toBe("A1");
  });
});
