<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/auth/module.json · modules/auth/server/auth.dto.ts ·
     modules/user_session/server/user_session.token.service.ts · proxy.ts
  3. phases/<set>/README.md
  4. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: this file §Order
-->

# phases — Wiring the Expo client to next-boilerplate (Phase Plan root index)

> This set wires `expo-react-native-boilerplate` to the **device bearer** auth surface of `next-boilerplate` and
> brings the UI down to a single design language using `kui-native` components.
> The convention is identical, one to one, to the sibling repo `next-boilerplate/phases/`.

## Why (context)

Today the client **does not talk** to the server:

- `services/**/*.service.client.ts` calls `/api/system/auth/*` — this path **does not exist** on the server.
- `libs/axios.ts` imitates a cookie-based web flow (building the `Cookie` header, parsing `Set-Cookie`) — unnecessary and wrong for mobile.
- The `services/**/*.dto.ts` schemas do not match the server's `Safe*` schemas (`UserSchema`, `MyTenantsResponseSchema`, `OTPVerifyRequestSchema`).
- The repo **does not build**: `@react-navigation/drawer` is missing from `package.json`, but `app/(drawer)/_layout.tsx` and `components/shell/*` import it.
- `components/ui/*` uses NativeWind `className`, `components/shell/*` uses inline `style={{}}` — two competing styling systems.

The server side, however, is **ready**: the bearer flow has been added with `audience: 'device'`. The client has no need for the cookie/CSRF dance.

## Owner decisions (fixed)

1. **kui-native is installed as a git package** (decision 2026-09-24; **supersedes** the earlier "vendor / copy it" decision). `package.json` → `"kui-native": "git+https://github.com/kuraykaraaslan/kui-native.git#<tag>"`. The source code is **not copied** into the repo. Bugs are fixed in kui-native and a new tag is cut.
   - **Expo SDK is upgraded to 57.** react / RN / expo must remain a single copy together with kui-native. The earlier "no SDK upgrade" decision was removed.
   - **Packaging changes may be made in the KUInative repo:** relative imports, peerDependencies, a theme override API.
2. **next-boilerplate is not touched.** The owner has already added mobile (`device`) support.
3. Scope of Phases 0–6: **auth core + tenancy core + SSO**. Members / invitations / roles were out of scope there. *(2026-10-08: Phases 7–18 below plan the next layer — members and invitations first, then push, security, account/branding, compliance and platform capabilities. Role **editing** and the permission matrix stay on the web.)*

## Order

| Phase | File | Topic | Priority |
|-----|-------|------|---------|
| 0 | [_foundation/phase-0-build-fix.md](_foundation/phase-0-build-fix.md) | Get the build working | ✅ `97a185e` |
| 1A | [_foundation/phase-1a-expo-sdk-57.md](_foundation/phase-1a-expo-sdk-57.md) | Expo SDK 55 → 57 | ✅ `365b597` |
| 1B | [_foundation/phase-1b-kui-native-package.md](_foundation/phase-1b-kui-native-package.md) | kui-native packaging (**in the KUInative repo**) + `v0.2.0` tag | ✅ KUInative `887ad72` · `v0.2.0` |
| 1C | [_foundation/phase-1c-kui-native-dependency.md](_foundation/phase-1c-kui-native-dependency.md) | kui-native git dependency + single design language | ✅ `ff2e1e1` |
| 1D | [_foundation/phase-1d-design-parity.md](_foundation/phase-1d-design-parity.md) | next-boilerplate visual parity (color, font, all screens) | ✅ `717be69` · kui-native `v0.3.1` |
| 2 | [_foundation/phase-2-transport.md](_foundation/phase-2-transport.md) | Transport layer (device bearer) | ✅ `feat/transport` |
| 3 | [auth/phase-3-dto-services.md](auth/phase-3-dto-services.md) | DTO + service alignment | ✅ `feat/dto-services` |
| 4 | [auth/phase-4-auth-screens.md](auth/phase-4-auth-screens.md) | Auth core screens | ✅ Coded 2026-10-07 |
| 5 | [tenant/phase-5-tenancy-core.md](tenant/phase-5-tenancy-core.md) | Tenancy core | ✅ Coded 2026-10-07 |
| 6 | [auth_sso/phase-6-sso.md](auth_sso/phase-6-sso.md) | SSO / OAuth | 🟡 **Client + server change written 2026-10-08; live verification pending** (see K4) |
| 7 | [tenant/phase-7-members-invitations.md](tenant/phase-7-members-invitations.md) | Members and invitations (`tenant_member`, `tenant_invitation`) | 🟡 **Coded except accept/decline (see file)** · P1 |
| 8 | [notifications/phase-8-push.md](notifications/phase-8-push.md) | Push registration (`notification_push`) | 🔴 Planned · P1 · **needs a server change** (K7) |
| 9 | [notifications/phase-9-inapp-feed.md](notifications/phase-9-inapp-feed.md) | In-app feed and unread badge (`notification_inapp`) | ✅ Coded 2026-10-08 · P1 |
| 10 | [auth_security/phase-10-security-2fa.md](auth_security/phase-10-security-2fa.md) | Security screen, TOTP, biometric lock (`user_security`, `auth`) | ✅ Coded 2026-10-08 · P1 |
| 11 | [auth_security/phase-11-passkey.md](auth_security/phase-11-passkey.md) | Passkeys (`auth_passkey`) | 🔴 Planned · P1 · **login half needs a server change** (K7) |
| 12 | [account/phase-12-account-tenant-settings.md](account/phase-12-account-tenant-settings.md) | Account audit, tenant settings, branding (`account`, `tenant_setting`, `tenant_branding`) | ✅ Coded 2026-10-08 (settings + primary-colour branding; audit & logos open) · P1 |
| 13 | [compliance/phase-13-consent-privacy.md](compliance/phase-13-consent-privacy.md) | Agreements, privacy requests, account deletion, audit viewer (`terms_consent`, `privacy`, `audit_log`) | ⬜ Planned · P2 |
| 14 | [platform/phase-14-locale-and-flags.md](platform/phase-14-locale-and-flags.md) | Server-aligned locale, feature flags and gates | ⬜ Planned · P2 |
| 15 | [platform/phase-15-files.md](platform/phase-15-files.md) | Uploads, avatar, media gallery, drive | ⬜ Planned · P2 |
| 16 | [platform/phase-16-realtime-messaging.md](platform/phase-16-realtime-messaging.md) | Socket.IO transport and messaging | ⬜ Planned · P2 |
| 17 | [platform/phase-17-search.md](platform/phase-17-search.md) | Global search (+ navigation decision) | ⬜ Planned · P2 |
| 18 | [platform/phase-18-tenant-admin.md](platform/phase-18-tenant-admin.md) | API keys and domains | ⬜ Planned · P2 |

## Locked decisions

- **K1 — Tenant bootstrap via config.** The server has **no** unauthenticated tenant discovery surface (the `/api/public/*` scan turned up no tenant endpoint; `GET /api/tenants` requires GLOBAL scope; `GET /auth/me/tenants` requires a session). A fresh install logs in to `EXPO_PUBLIC_DEFAULT_TENANT_ID`, then fetches the real membership list.
- **K2 — Token pair per tenant.** A device token is bound to **a single tenant**, and there is **deliberately no** tenant-switch endpoint for device. The SecureStore keys become `accessToken:{tenantId}` / `refreshToken:{tenantId}`; switching to a previously signed-in tenant does not ask for the password.
- **K3 — Origin + tenant prefix interceptor.** `EXPO_PUBLIC_API_URL` is the origin only. The request interceptor prepends `/api/tenant/{activeTenantId}` to every relative path. *(Correction 2026-09-25: the earlier text said `/api/tenant/{id}/api`. Because `proxy.ts` rewrites the path `/api/tenant/{id}/<rest>` to `/tenant/{id}/api/<rest>`, that prefix would have produced `/api/api/…` and returned 404.)*
- **K4 — SSO on device does NOT WORK without a server change.** The OAuth callback calls `createSession` without an audience → it produces a **`web` audience token**, which the bearer path rejects. It also redirects to an https web URL, not to the app scheme. The client side is built completely; Phase 6 is not marked `CODED` until the server change lands. *(2026-10-08: the server change is written in next-boilerplate, see phase-6; it is not marked `CODED` until it is deployed and verified on a device.)*
- **K5 — kui-native is a git dependency pinned to a tag.** Application code takes components only from the `@/components/ui` barrel. The barrel re-exports from kui-native with **deep imports** (`kui-native/modules/ui/Button`). The full barrel (`kui-native/modules/ui`) is not used because it pulls in the optional peers (maps, video). Patching `node_modules` and `patch-package` are forbidden. Pinning to a branch (`#main`) is forbidden too.
- **K6 — DTO + service side by side in the domain folder.** There is no top-level `dto/`. `services/<domain>/<domain>.service.client.ts` and `services/<domain>/<domain>.dto.ts` live in the same folder (the client counterpart of next-boilerplate's `modules/<name>/server/<name>.dto.ts` layout). Domains: `auth/` (auth + sso), `tenant/`, `user/` (profile + notification); shared schemas go in `services/common.dto.ts`. Since the client is small, no subfolders (`dto/`, `tests/`) are created.
- **K7 — Server-gated phases are marked 🔴 and not coded until the server change is deployed.** Found while planning Phases 7–18 (2026-10-08, by reading `module.json` and the route files): `notification_push` accepts **Web Push subscriptions only** (`{endpoint, keys:{p256dh, auth}}`) with no Expo/FCM token path (Phase 8), and `auth_passkey` `login/verify` **sets web cookies** instead of returning a device pair (Phase 11, same class as K4). The client does not emulate either.
- **K8 — Every new phase starts with a contract check.** Routes in the Phase 7–18 files come from `module.json`; request/response shapes must be read from the server source before DTOs are written, and corrections recorded in the phase file (the Phase 3 lesson). Domain folders under `services/` follow K6; new ones planned: `compliance/`, `platform/`.
- **AGENTS.md rules are binding:** `@/*` is the only alias, NativeWind + `cn()`, Zustand + MMKV, tokens only in SecureStore, all fetches go through `libs/axios`, parse with Zod, env via `libs/env`, logging via `libs/logger`, icons only FontAwesome, `expo-haptics` on critical actions, toast via `sonner-native`.
- **Catalog sync is mandatory:** at the end of every phase that changes a screen / component / service / store / DTO / lib, run `npm run registry:snapshot` and commit the generated files.

## Dependency graph (summary)

- Phase 1A and Phase 2 **cannot be opened** without Phase 0 (the repo does not build).
- Phase 1B (KUInative repo) is independent of Phase 0 and can start in parallel **immediately**.
- Phase 1C depends on both Phase 1A (same SDK) and Phase 1B's tag.
- Phase 2 opens after Phase 1A (so the transport is verified once on SDK 57). It runs in parallel with Phase 1B/1C.
- Phase 3 depends on Phase 2's interceptor prefix — service paths are written relative accordingly.
- Phase 4 and Phase 5 depend on Phase 3's DTOs and on Phase 1C's `@/components/ui` barrel.
- Phase 5's tenant switch depends on Phase 2's per-tenant SecureStore keys (K2).
- Phase 6 depends on Phase 5's active-tenant concept; it also depends on a server-side change (K4).
- Phase 7 depends on Phase 5 (pending invitations, `tenant-login`, switching).
- Phase 8 depends on a server change (K7) and Phase 5's `knownTenantIds` cleanup; Phase 9 depends only on Phase 2 and is independent of Phase 8.
- Phase 10 depends on Phase 4; Phase 11 depends on Phase 10, a server change (K7) and a development build.
- Phase 12 depends on Phase 5 and kui-native's theme override API (Phase 1B).
- Phase 13 depends on Phases 4 and 5; account deletion uses Phase 5's `flush()` and Phase 8's unregister when shipped.
- Phases 14–18 are independent of each other except: 15 feeds the avatar in 12, 16 reuses 7 and 9, 17 routes into 7/9/16 screens.

## Server contract (read-only summary)

Address shape: **`/api/tenant/{tenantId}/<path>`**. `proxy.ts` rewrites this to `/tenant/{tenantId}/api/<path>`; `<path>` is the part of the module path after `/api` (e.g. `/api/auth/me/sessions` in `module.json` → `/auth/me/sessions`).

| Path | Body | Response |
|---|---|---|
| `POST …/auth/device/login` | `{email, password, captchaToken?, rememberMe?, device?}` | `{accessToken, refreshToken, otpRequired, user, tenant, tenantMember, userSecurity, mustChangePassword, passwordExpiresInDays}` |
| `POST …/auth/device/refresh` | `{refreshToken}` | `{message, accessToken, refreshToken}` |

- All other routes accept `Authorization: Bearer <accessToken>`; when there is no cookie the audience `device` is selected (`user_session.service.next.ts:63`).
- **There is no device-fingerprint verification for the device audience** (`user_session.session.service.next.ts:95` derives it only for `web`) and **bearer requests are exempt from CSRF** (`modules/common/server/csrf.ts`). A change of IP / User-Agent does not drop the session.
- `TokenAudience = "web" | "device"` (`user_session.token.service.ts:25`). Access ~1h, refresh ~7d, refresh rotates and reuse detection exists.
- JWT payload `{userId, userSessionId, tenantId, …}` — the token is bound to **a single tenant**.
- The error envelope is **not uniform**; all four shapes must be handled: `{message, code}` · `{message:'Validation error', issues:[…]}` · `{error: <string>}` · `{error: <zod issues[]>}`.

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
When finished, a `---` + `## ✅ CODED — <date>` stamp is appended below the file, with a `**Deliberate deviations:**` list if any; the §Order row in this file is updated with the commit SHA.
