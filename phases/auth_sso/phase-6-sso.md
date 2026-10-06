<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference
  3. phases/README.md (§Locked decisions K4)
  4. phases/auth_sso/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 6 — SSO / OAuth (⛔ blocked on a server change)

**Goal:** Build the client side completely; report the server blocker (K4) to the user and the developer **explicitly**. The moment the server change lands, it should work without writing extra code.

> **This phase is not marked `CODED` until the server side is complete.** Rationale and the requested change: `phases/auth_sso/README.md`.

## 6.1 Provider list

- [ ] `services/auth/sso.service.client.ts` (created in Phase 3) → `getProviders()` `GET /auth/sso` response `{providers: [...]}`, parsed with `SSOProvidersResponseSchema`.
- [ ] `components/auth/SSOButtons.tsx` → the **hard-coded provider list inside it is removed**; the providers the tenant allows come from the server (`SSOService.isProviderEnabled` gates per tenant).
- [ ] Provider icons are mapped from `@fortawesome/free-brands-svg-icons` (AGENTS.md §6 Rule 10: no icon library other than FontAwesome). A neutral fallback for providers with no counterpart.
- [ ] If the list is empty, the SSO section is **not rendered at all** (including the divider line).

## 6.2 Browser flow

- [ ] `GET /auth/sso/{provider}` → `{url, state}`; `state` is stored and compared on return (CSRF / mixed-flow protection).
- [ ] `scheme` is added to `app.config.ts` (e.g. `expoboilerplate`) — the `reset-password` deep link uses it too.
- [ ] `expo-web-browser` → `openAuthSessionAsync(url, redirectUrl)`; `redirectUrl` is the output of `expo-linking`'s `createURL('/auth/callback')`.
- [ ] The `expo-linking` handler catches `<scheme>://auth/callback?rawAccessToken=…&rawRefreshToken=…`:
  - The `state` match is verified.
  - Tokens are written with `setToken(kind, activeTenantId, value)`.
  - Verified with `GET /auth/session`, and `authStore` + `tenantStore` are populated.
- [ ] If the user closes the browser (`type: 'cancel'` / `'dismiss'`), they silently stay on the login screen and no error is shown.

## 6.3 Blocker behavior (until the server change lands)

- [ ] If the flow returns with a **web-audience** token (today's situation): `GET /auth/session` returns 401.
- [ ] This case is caught **specifically**:
  - `logger.error` logs "SSO callback returned a web-audience token; device bearer flow requires server-side `audience: 'device'` — see phases/auth_sso/README.md".
  - A clear message to the user via `toast.error`: "Sosyal giriş şu an kullanılamıyor, lütfen e-posta ile giriş yapın."
  - Tokens are **not written** (if they were, every request would return 401 and the user would stay locked out).
- [ ] If the redirect lands on an https address and the browser does not close, the same message is shown after a timeout.

## 6.4 Linked accounts (scope boundary)

- [ ] Linked accounts are **listed** with `GET /auth/me/social-accounts` (read-only).
- [ ] Linking / unlinking (`connect/{provider}`, `DELETE /{provider}`) is **outside the scope of this phase** — it hits the same callback blocker and is left until after the server change.

## Files touched / created

- Changed: `components/auth/SSOButtons.tsx`, `app/(auth)/login.tsx` (SSO entry), `app.config.ts` (+`scheme`), `package.json` (`expo-web-browser` and `expo-linking` are already present — verified)
- New: `libs/ssoSession.ts` (browser flow + deep-link handler), `app/(drawer)/settings/social-accounts.tsx` (read-only list)
- Test: provider list, state mismatch, web-audience blocker under `__tests__/`

## Reuse

- `services/auth/sso.service.client.ts` + `services/auth/sso.dto.ts` — created in Phase 3, only consumed here.
- `libs/secureStorage.ts` per-tenant keys (Phase 2).
- `stores/tenantStore.ts:activeTenantId` (Phase 5) — the tenant half of `state` comes from here.
- `libs/apiError.ts` (Phase 2), `libs/logger.ts`, `sonner-native`.
- `expo-web-browser` + `expo-linking` — both are already in `package.json`, no new dependency.
- `@/components/ui` (kui-native, Phase 1C): `Button`, `Separator`, `AlertBanner`, `Spinner`.

## Acceptance criteria

**WITHOUT the server change** (this phase's deliverable state):

- The `GET /auth/sso` provider list arrives and the buttons show the providers the tenant allows; if the list is empty, the section does not appear at all.
- Pressing a button opens the browser with the correct provider URL.
- On return, the web-audience blocker is **explicitly logged** and a clear message is shown to the user; **no token is written**, the user is not locked out.
- If the user closes the browser, no error is shown.
- On a `state` mismatch the flow is rejected.

**AFTER the server change LANDS** (the condition for the phase to be `CODED`):

- Signing in with Google returns to the app, tokens are written, `GET /auth/session` returns 200 and the user enters the drawer.
- All subsequent bearer requests work (audience `device`).

## Risks

- **Trying to bypass the blocker with a "workaround":** carrying the session over with a cookie-holding WebView looks technically possible, but it puts the app into an identity model split between bearer and cookie and invalidates all of Phase 2's refresh logic. **It will not be done.**
- **Writing the token anyway:** if a web-audience token is written to SecureStore, the user is locked in a "signed-in" state where every request returns 401 and cannot find the way out. The worst scenario.
- **`scheme` collision:** if the chosen scheme collides with another app, the deep link goes to the wrong app; it must be chosen to be sufficiently unique.
- **Where `state` is stored:** if written to MMKV it is not lost when the app goes to the background and comes back; if kept in memory it is lost and the flow is rejected every time.
- **Missing provider icon:** if there is no fallback for providers with no counterpart in FontAwesome brands (autodesk, weibo, alipay), rendering breaks.
- **Marking the phase status wrongly:** if `CODED` is written because the client side is done, a later reader will assume SSO works. The §Order row must stay `⛔ BLOCKED ON A SERVER CHANGE` until the server change lands.
