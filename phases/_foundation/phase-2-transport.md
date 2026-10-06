<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/auth/module.json · modules/auth/server/auth.dto.ts ·
     modules/user_session/server/user_session.{token.service,service.next,session.service.next}.ts ·
     modules/common/server/csrf.ts · proxy.ts
  3. phases/README.md (§Locked decisions K1–K3)
  4. phases/_foundation/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision beats this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 2 — Transport layer (device bearer)

**Goal:** A single `axiosInstance` should speak the server's **device bearer** contract completely: the correct address shape, `Authorization: Bearer`, transparent per-tenant refresh, and unification of the four error envelopes.

> **Today's state is wrong:** `libs/axios.ts` builds a `Cookie: accessToken=…; refreshToken=…` header by hand, parses `Set-Cookie` from the response, and calls `/api/system/auth/refresh`. The server has neither this path nor any need for cookies. Moreover, `user_session.service.next.ts:63` picks the audience with `cookieAccessToken ? 'web' : 'device'` — sending a cookie drops the client into the **wrong audience**.

## 2.1 Env

- [ ] `libs/env.ts` → `EXPO_PUBLIC_API_URL` is now **origin only**: **no** `/api`, default `http://10.0.2.2:3000` (the Android emulator host).
- [ ] **New** `EXPO_PUBLIC_DEFAULT_TENANT_ID` — uuid, **required** (no default). Per K1: the server has no unauthenticated tenant discovery surface; a fresh install logs in to this tenant.
- [ ] `.env.example` is updated with both keys.

## 2.2 SecureStore — per-tenant key (K2)

- [ ] The `libs/secureStorage.ts` API takes a tenant:
  - `getToken(kind: 'accessToken'|'refreshToken', tenantId: string): Promise<string|null>`
  - `setToken(kind, tenantId, value)` · `clearTenantTokens(tenantId)` · `clearAllTokens()`
  - Physical key: `kind` + `":"` + `tenantId`.
- [ ] `clearAllTokens()` deletes the keys of **all** tenants. Since SecureStore offers no key listing, the list of known tenantIds is read from `tenantStore`; as an extra safeguard, a `knownTenantIds` array is kept in MMKV.
- [ ] Why: a device token is bound to **a single tenant** (`TokenPayload.tenantId`) and there is **deliberately no** tenant-switch endpoint for device. Keeping a pair per tenant allows switching to a previously entered tenant **without asking for the password**.

## 2.3 libs/axios.ts — full rewrite

- [ ] `baseURL` = `env.EXPO_PUBLIC_API_URL` (origin).
- [ ] **Request interceptor:**
  - The `/api/tenant/{activeTenantId}/api` prefix is added to relative paths; `activeTenantId` is read **synchronously** with `useTenantStore.getState().activeTenantId` (not a hook).
  - `Authorization: Bearer <accessToken>` (that tenant's token).
  - **The cookie-building logic is deleted entirely.**
- [ ] **Response interceptor:** `Set-Cookie` parsing is **deleted entirely**.
- [ ] **401 + `SESSION_EXPIRED` / `UNAUTHORIZED`** → per-tenant **single-flight** refresh:
  - `POST /api/tenant/{tenantId}/api/auth/device/refresh` with body `{refreshToken}`.
  - The response is `{message, accessToken, refreshToken}` — **both** are written to SecureStore (refresh rotates; keeping the old token triggers reuse detection and deletes **all sessions**).
  - Pending requests are queued and replayed after the refresh. The queue is separate **per tenant**.
  - If the refresh also returns 401: that tenant's tokens are deleted, `authStore.logout()` is called, and the user is redirected to login.
  - If the refresh fails with **any other** error (429, network, 5xx), the session is **not considered dead** — the server route's comment says so explicitly.
- [ ] **401 + `OTP_REQUIRED` / `TOTP_REQUIRED`** → refresh is **not attempted**, redirect to `/2fa`. (The session is alive; only the OTP gate is closed.)
- [ ] **`TENANT_INACTIVE` / `NOT_TENANT_MEMBER` / `TENANT_NOT_FOUND`** → that tenant's session is dropped, redirect to `/select-tenant`.
- [ ] **429** → `Retry-After` is read and the duration is shown with `sonner-native`; the request is **not retried** and does not enter the refresh loop.
- [ ] `timeout` 10000 is kept.

## 2.4 Error normalization

- [ ] `libs/apiError.ts` (new) — `normalizeApiError(err: unknown)` → `{message, code?, statusCode?, issues?}`. Handles **all four** envelope shapes:
  1. `{message, code}` (AppError)
  2. `{message: 'Validation error', issues: [...]}` (ZodError)
  3. `{error: '<string>'}` (login/register 403/404)
  4. `{error: [<zod issues>]}` (device login 400)
- [ ] `services/common.dto.ts:extractErrorMessage` and `libs/errorUtils.ts` **delegate** to it — both are kept, so existing call sites do not break.
- [ ] Unknown shape → `i18n.t('ERRORS.UNEXPECTED')` (today's behavior).

## 2.5 Device info

- [ ] `expo-device` is added as a dependency (it is **not** in `package.json`; `npx expo install expo-device`).
- [ ] `libs/deviceInfo.ts` (new) → produces the `DeviceInfoDTO` body:

  | DTO field | Source |
  |---|---|
  | `type` | `Device.deviceType` → mapped to `phone` / `tablet` / `tv` / `desktop` / `other` |
  | `brand` | `Device.brand` |
  | `model` | `Device.modelName` |
  | `name` | `Device.deviceName` |
  | `os` | `Device.osName` |
  | `osVersion` | `Device.osVersion` |
  | `appVersion` | `env.EXPO_PUBLIC_APP_VERSION` |

- [ ] All fields are optional; those that are `null` / `undefined` are **left out** of the body (the server expects `.optional()`, and sending `null` breaks Zod).
- [ ] This object is written to `UserSession.metadata.device` and shown in the "Aktif oturumlar" panel (`SessionMetaSchema`).

## Files touched / created

- New: `libs/apiError.ts`, `libs/deviceInfo.ts`
- Changed: `libs/axios.ts` (full rewrite), `libs/env.ts`, `libs/secureStorage.ts`, `libs/errorUtils.ts`, `services/common.dto.ts`, `stores/tenantStore.ts` (+`activeTenantId`), `package.json` (+`expo-device`), `.env.example`
- Test: `__tests__/_handlers.ts`, `__tests__/_server.ts` (MSW), new `__tests__/axios.test.ts`, `__tests__/apiError.test.ts`

## Reuse

- `libs/secureStorage.ts` — not deleted, its signature is extended (AGENTS.md §6 Rule 5: tokens **only** in SecureStore).
- `libs/logger.ts` — all interceptor logs go through it (Rule 9: `console.*` is forbidden).
- `services/common.dto.ts:extractErrorMessage` + `libs/errorUtils.ts` — kept, delegating to `apiError.ts`.
- `sonner-native` — 429 and session-drop notifications (Rule 12).
- The existing single-flight `isRefreshing` + `failedQueue` pattern — extended into a per-tenant queue, not written from scratch.

## Acceptance criteria

- `POST …/auth/device/login` with valid credentials returns 200; `accessToken` + `refreshToken` are written to SecureStore **under the tenant key**.
- With `ACCESS_TOKEN_EXPIRES_IN=60s` on the server, the first request after expiry succeeds via a **transparent** refresh; the user sees nothing.
- **5 concurrent requests trigger a single refresh** (verified by a unit test), and all five complete successfully.
- If the refresh returns 401, the user lands on login; if the refresh returns 429, the session is **kept** and a toast appears.
- A request that gets `OTP_REQUIRED` **does not attempt a refresh** and redirects to `/2fa`.
- There is **no** `Cookie` header on outgoing requests (verified with the network log) — otherwise the server falls into the `web` audience and rejects the token.
- There is **no** `x-csrf-token` on outgoing requests and none is needed (bearer is exempt from CSRF).
- `normalizeApiError` returns the correct message in four fixture tests, one for each of the four envelope shapes.
- The `device` object in the login body arrives populated on the emulator and shows up again in the `/auth/me/sessions` response.

## Risks

- **Leftover cookie (the sneakiest):** if a single `Cookie` line remains in the interceptor, the server picks the `web` audience and **every** bearer request returns 401. The deletion must be complete; not even a commented-out line should be left.
- **Refresh token rotation:** if the new `refreshToken` that comes back is not written, the next refresh hits **reuse detection** and **all** of the user's sessions are deleted. The most expensive bug.
- **Per-tenant queue:** if a single global `isRefreshing` flag is left, tenant A's refresh makes tenant B's requests replay with the wrong token.
- **Empty `activeTenantId`:** the first request fired before the store hydrates produces `/api/tenant/undefined/api/...`. If `activeTenantId` is missing, the interceptor must fall back to `EXPO_PUBLIC_DEFAULT_TENANT_ID` and never write `undefined`.
- **Infinite refresh loop:** if the refresh request itself gets a 401, the interceptor must not send it into refresh again — the refresh call must be marked with `_retry`.
- **`clearAllTokens` gap:** since SecureStore does not list keys, an unknown tenant key may remain on the device → if the `knownTenantIds` list is not kept current, sessions leak.

---

## ✅ CODED — 2026-09-25 (branch `feat/transport`)

Verification:
- typecheck 0 errors.
- test:ci 20/20: `axios.test.ts` 10, `apiError.test.ts` 8, smoke 2.
- web export succeeded (with `EXPO_PUBLIC_DEFAULT_TENANT_ID`).
- No `Cookie` or `x-csrf-token` on outgoing requests (verified by test).
- **Mutation check:** removing the grace window or single-flight breaks the corresponding test.

The contract was verified against the next-boilerplate source: `auth-device-{login,refresh}.route.ts`, `user_session.service.next.ts` (bearer path), `route-error.ts`, `proxy.ts` and the web client `common/server/axios/axios.client.ts`.

**Deliberate deviations (plan, corrected against the source code):**
- **URL prefix `/api/tenant/{id}`** (plan: `/api/tenant/{id}/api`). The proxy adds the `/api` segment itself. K3 was corrected in the README.
- **401 classification is done by message, not by code.**
  - For an expired access token the server returns `message: TOKEN_EXPIRED, code: SESSION_EXPIRED`; for a truly dead session the same code comes with `message: SESSION_EXPIRED`. The plan's "`SESSION_EXPIRED` → refresh" rule would have sent a dead session into refresh.
  - The applied rule is the same as next's own client:
    - Refresh + replay: `TOKEN_EXPIRED` / `SESSION_NOT_FOUND` / `USER_NOT_AUTHENTICATED`.
    - Session ends: `SESSION_EXPIRED` / `SESSION_REVOKED` / `INVALID_TOKEN` / `REFRESH_TOKEN_REUSED` / `DEVICE_FINGERPRINT_MISMATCH`.
    - OTP gate: `OTP_REQUIRED` (message or code) and `TOTP_REQUIRED`.
- **A 10 s grace window after refresh was added** (plan: queue only). 401s that come back with the old token right after a refresh finishes are not refreshed again but replayed directly. The same reuse-detection storm protection as in the next client.
- **SecureStore key is `kind.tenantId`** (plan: `kind:tenantId`). SecureStore accepts only `[A-Za-z0-9._-]`; `:` would have thrown at runtime.
- **Redirects are not in the interceptor.** Per the appshell-compliance rule, the interceptor updates the store and the layout guards redirect:
  - When the session ends, `authStore.logout()` → `/login`.
  - When OTP is required, `authStore.otpRequired` → `/2fa`. The `(auth)` guard keeps the user in the group while `otpRequired` is set.
- **When organization access ends:** for `TENANT_*` / `NOT_TENANT_MEMBER` the plan said `/select-tenant`; for now it goes back to login. Since `select-tenant` is in the `(auth)` group, a signed-in user cannot be redirected there; a known flow bug. It will be turned into select-tenant in Phase 4/5.
- **The 429 toast is not in the interceptor:** `normalizeApiError` produces the message with `Retry-After`, and the screen's `handleApiError` shows it. Errors the interceptor handles (session ended, OTP) are marked with `markHandled`; `handleApiError` does not show a second toast for them.
- **Session restore at startup:** only 401/403 logs the user out. A network error or 5xx keeps the persisted session (previously every error logged out).
- **`EXPO_PUBLIC_DEFAULT_TENANT_ID` is required**; without `.env` the app halts at startup with a Zod error. No uuid requirement was added (`min(1)`), because the server does not enforce the tenantId format.

**Remaining (Phase 3):** services still call `/api/system/...` and, with the new prefix, still go to the wrong address. `deviceInfo` will be wired into the login body in Phase 3 (`AuthClientService.deviceLogin`). Verification on the emulator against a real server (transparent refresh with a 60 s access token) can be done after Phase 3.
