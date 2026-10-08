<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/auth_passkey/{module.json,server/*}
  3. phases/README.md (§Locked decisions K2, K4)
  4. phases/auth_security/README.md (S1, S3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 11 — Passkeys

**Goal:** A user can register a passkey on the device and sign in with it, getting a normal device-audience token pair for the tenant.

Module: `auth_passkey`. Priority 1. **Login half is blocked on a server change (S1).** Registration and management can be built first.

## 11.1 Server prerequisites (owner action)

- [ ] **Device-audience login.** `POST /api/auth/passkey/login/verify` currently calls `createSession` and sets `accessToken`/`refreshToken` cookies. A device client needs the pair in the JSON body (as `device/login` does, `audience: 'device'`). Write the change in next-boilerplate and record the response shape here.
- [ ] **Relying party binding.** WebAuthn on native validates the RP ID against the app. Publish `/.well-known/assetlinks.json` (Android) and `/.well-known/apple-app-site-association` (iOS) on the RP domain, and allow the native origins in the server's expected-origin list. Record the RP ID and origins here.
- [ ] **Tenant addressing.** `passkey/login/options` is unauthenticated, so the request must carry the tenant in the path (K3 prefix with `EXPO_PUBLIC_DEFAULT_TENANT_ID` or the tenant the user typed). Confirm how the server finds the user (identifier in the options request?).

## 11.2 Client

- [ ] Native module: `react-native-passkey` (or Expo's equivalent when available for SDK 57) — requires a **development build**, not Expo Go. Add the associated-domains entitlement (iOS) and asset-links verification (Android) in `app.config.ts`.
- [ ] `services/auth/passkey.{dto,service.client}.ts` (K6): `GET /auth/me/security/passkeys`, `POST …/register` (options), `POST …/register/verify`, `DELETE …/passkeys/[credentialId]`; login `options` / `verify`.
- [ ] `app/(drawer)/settings/passkeys.tsx`: list (name, created, last used, transports), add, rename if supported, delete with confirmation; refuse to remove the last credential if the account has no password (show the server error).
- [ ] Login screen: "Sign in with a passkey" button → options → OS sheet → verify → `startDeviceSession` exactly as `deviceLogin` does (per-tenant pair, K2). Hide the button when the platform does not support passkeys or the tenant policy disallows them.

## Files touched / created

- New: `services/auth/passkey.{dto,service.client}.ts`, `app/(drawer)/settings/passkeys.tsx`, `libs/passkey.ts`
- Changed: `app/(auth)/login.tsx`, `app.config.ts`, `package.json`, `locales/*.json`
- Test: registration and list with MSW, login → session start (mocked native module), unsupported-platform hiding

## Reuse

- Phase 4 `startDeviceSession` / `activateSignedInTenant`; Phase 10 security screen entry; K2 storage.

## Acceptance criteria

- A passkey registered on the device appears in the list and can be removed.
- Passkey sign-in produces a device-audience pair; subsequent requests use the bearer path and refresh works.
- A tenant that disables passkeys hides the button and the server rejects a forced attempt.
- Nothing parses cookies (AGENTS.md hard rule).
- `npm run registry:snapshot` is up to date.

## Risks

- **Server change / domain files not in place** — WebAuthn fails with opaque OS errors; verify with a physical device.
- **Native-origin allowlist.** Android origins are `android:apk-key-hash:…`; the signing key differs per build variant, so debug/release need separate entries.
- **Dev-build only.** Document that passkeys cannot be exercised in Expo Go.
