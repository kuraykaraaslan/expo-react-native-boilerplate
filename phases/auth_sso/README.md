<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/auth_sso/server/{sso.route,sso-provider.route,auth_sso.config,auth_sso.dto}.ts ·
     app/api/auth/callback/[provider]/route.ts ·
     modules/user_session/server/user_session.token.service.ts (TokenAudience)
  3. phases/README.md (§Locked decisions K4)
  4. phases/auth_sso/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# auth_sso — social login (Phase Plan index)

> 🟢 **UPDATE 2026-10-08: the server change has been written** in next-boilerplate (`GET /auth/sso/{provider}?redirect_uri=…`
> gated by `SSO_DEVICE_REDIRECT_URIS`, and a `device`-audience redirect from the callback; see
> `modules/auth_sso/README.md` there and the end of [phase-6-sso.md](phase-6-sso.md)). The text below describes the problem it solves.
> What remains is deploying it and verifying a Google sign-in on a device.
>
> ⛔ **(Original status) THIS SET IS BLOCKED ON A SERVER CHANGE.** The client side is built completely, but
> unless the owner makes the two changes below in `next-boilerplate`, the flow **cannot work** and the phase
> is not marked `CODED`. By owner decision, the server is not touched from this repo.

## Why it does not work (K4 — verified by reading the code)

`app/api/auth/callback/[provider]/route.ts` does two things:

1. **`createSession({ user, request, userSecurity, otpIgnore: true, tenantId })` — it does not pass an `audience` parameter.**
   The default in `user_session.crud.service.ts:43` is `"web"`. So the token pair produced by SSO is in the **`web` audience**.
   The bearer path (`user_session.service.next.ts:63`) picks the **`device`** audience when there is no cookie, and
   `verifyAccessToken` rejects this token. **This cannot be worked around on the client side.**
2. **It redirects to `${APP_HOST}/tenant/{tenantId}/auth/callback?rawAccessToken=…&rawRefreshToken=…`** —
   that is, to an **https web URL**, not the app scheme. `openAuthSessionAsync` closes only when it reaches the
   `redirectUrl` it was given; when it lands on an https address the browser stays open.

There is also no room to maneuver: `sso-provider.route.ts` generates `state` **itself** as `"{tenantId}.{uuid}"`
(there is no place to put a return address or an audience flag in it), and in `auth_sso.config.ts` `callbackPath`
is **fixed** per provider.

## Minimum change requested from the server (the owner applies it)

1. In `app/api/auth/callback/[provider]/route.ts`, an `audience` option on the `createSession(...)` call; pass `'device'` in the device flow.
2. In the device flow, the final redirect must be possible to the app scheme (`<scheme>://auth/callback?...`); the fact that the flow is a device flow must be carriable through `state`.

## Order

| Phase | File | Topic | Priority |
|-----|-------|------|---------|
| 6 | [phase-6-sso.md](phase-6-sso.md) | SSO / OAuth client side | ⛔ **BLOCKED ON A SERVER CHANGE** |

## Locked decisions

- **Silent failure is forbidden.** If the flow is attempted before the server change lands, the user sees a meaningful error and the event is logged with `libs/logger`; it is not glossed over with "something went wrong".
- **The client side is built completely.** The provider list, the `openAuthSessionAsync` flow, the deep-link handler and the DTOs are finished in this phase so that it works without waiting on a single line once the server change lands.
- **The provider list comes from the server.** The hard-coded list in `components/auth/SSOButtons.tsx` is removed; the providers the tenant allows are read from `GET /auth/sso`.
- **The phase is not marked `CODED`** — until the server side is complete, the §Order row stays `⛔ BLOCKED ON A SERVER CHANGE`.

## Dependency graph (summary)

- Phase 6 depends on Phase 3's `services/auth/sso.dto.ts` and `services/auth/sso.service.client.ts`.
- Phase 6 depends on Phase 5's `activeTenantId` (`state = "{tenantId}.{uuid}"`).
- The `scheme` to be added to `app.config.ts` is also used by Phase 4's `reset-password` deep link.

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
