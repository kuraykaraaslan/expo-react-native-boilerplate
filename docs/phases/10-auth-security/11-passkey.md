<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/auth_passkey/{module.json,server/*}
  3. docs/phases/README.md (§Locked decisions K2, K4)
  4. docs/phases/10-auth-security/README.md (S1, S3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: docs/phases/README.md §Order
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

---

## Shipped 2026-10-10 (sign-in + registration/management coded; live verification pending)

Routes, bodies and responses below were READ from the uncommitted working tree of next-boilerplate (`modules/auth_passkey/server/*`, `common/server/mobile-app-links.ts`, `env` schema), not from the hand-over summary.

### What shipped

- `react-native-passkey@3.6.2` (exact pin, installed with npm). Native module, autolinked: no Expo config plugin exists or is needed; it requires a **development build** (never Expo Go). Its peers are `react`/`react-native: *`; compatibility with Expo SDK 57 / RN 0.86 is by autolinking only and was NOT built on a device here.
- `libs/passkey.ts`: `passkeysAvailable()` (module linked AND `Passkey.isSupported()` AND `EXPO_PUBLIC_PASSKEY_RP_ID` set; a throwing check counts as unavailable), `signInWithPasskey(email?)`, `registerPasskey(label?)`, error classification (cancelled is silent), mapping between server WebAuthn JSON and the native request/response types. Answers that arrive after an organization switch or sign-out are dropped (same guard idea as `libs/realtime.ts`); a pair minted for another tenant is never stored. Challenges, assertions, credential ids and tokens are never logged.
- Sign-in completes through `startDeviceSession` in `libs/session` exactly like password login (per-tenant pair in SecureStore, K2). `app/(auth)/login.tsx` shares one `finishLogin` for both paths. `components/auth/PasskeyButton.tsx` renders nothing when unavailable (no request, no OS call).
- Management: `components/security/PasskeysCard.tsx` (+ `PasskeyRenameModal.tsx`) is mounted in the security screen (not a separate `passkeys.tsx` screen): list, add, rename, delete with confirmation, single-passkey backup nudge from the server's `backupGuidance`. Add is hidden where passkeys cannot work; list/remove stay.
- `services/auth/passkey.dto.ts`, `passkey.service.client.ts`, new `PASSKEY_*` and `ACCOUNT_DISABLED` codes in `libs/apiError.ts`, `EXPO_PUBLIC_PASSKEY_RP_ID` in `libs/env.ts`, `.env.example`, and `app.config.ts` (iOS `associatedDomains: ["webcredentials:<RP id>"]` only when the RP id is set; `EXPO_PUBLIC_IOS_BUNDLE_ID` / `EXPO_PUBLIC_ANDROID_PACKAGE` override the existing placeholders). Strings in all six locales. Tests: `__tests__/passkey.test.tsx` (native module mocked; MSW for the routes).

### Server contract (as read)

| Purpose | Route (tenant-prefixed) | Notes |
|---|---|---|
| Login options | `POST /auth/device/passkey/login/options` `{ email? }` | Unauthenticated. With `email`: allow-list of that user's credentials (404 if none); without: usernameless challenge. Usernameless challenges share ONE server slot, so the client sends the typed e-mail when it is well formed. |
| Login verify | `POST /auth/device/passkey/login/verify` `{ response, email?, device? }` | Same body as `/auth/device/login` with `otpRequired: false` always (passkey satisfies login alone), `mustChangePassword`, session extensions. 403 if the user is not an ACTIVE member of the tenant or the account is disabled; 400 `PASSKEY_CHALLENGE_EXPIRED` / `PASSKEY_AUTHENTICATION_FAILED`; 404 unknown passkey. Token is bound to that tenant only. |
| List | `GET /auth/me/security/passkeys` | `{ passkeys: [{credentialId,label,createdAt,lastUsedAt|null,transports[]}], backupGuidance: {passkeyCount,shouldAddBackup,reason} }`. Account-level (same in every tenant). |
| Register options | **`GET`** `/auth/me/security/passkeys/register` | Challenge kept server-side 5 min; 409 `PASSKEY_LIMIT_REACHED` at 10. |
| Register verify | `POST …/register/verify` `{ response, label? }` | `{ message, credentialId }`. |
| Rename | `PATCH …/passkeys/{credentialId}` `{ label }` (1..64) | `{ passkey, message }`; a 400 here uses the key `error`, not `message`. |
| Delete | `DELETE …/passkeys/{credentialId}` | `{ message }`; 404 `PASSKEY_NOT_FOUND`. |

### Deviations

- Differences between the hand-over summary / this phase's original plan and the source: registration options are a **GET**, not a POST; **rename exists** (PATCH); the list wraps the array in `{ passkeys, backupGuidance }`; the server has **no "last credential" guard** on delete (the client does not invent one; removing the last passkey just turns `passkeyEnabled` off and password/other sign-in remains the account's business); no tenant policy flag for disabling passkeys was found in the routes, so the button is hidden only by device/config capability; the server also exposes web-cookie `/auth/passkey/login/*` routes which the client never uses.
- Management lives in the security screen as a card instead of `settings/passkeys.tsx`.
- Passkey availability additionally requires `EXPO_PUBLIC_PASSKEY_RP_ID`, so a build without a configured relying party never shows a button that could only fail.

### Origin / RP-id requirements (server env, read from source)

- `WEBAUTHN_RP_ID` (default: hostname of `NEXT_PUBLIC_APPLICATION_HOST`) must equal the app's `EXPO_PUBLIC_PASSKEY_RP_ID`.
- `WEBAUTHN_ORIGIN` (default: origin of `NEXT_PUBLIC_APPLICATION_HOST`; iOS reports `https://<rpId>`), `WEBAUTHN_EXTRA_ORIGINS` (comma list).
- Android reports `android:apk-key-hash:<base64url sha256>`; the server derives these from `MOBILE_ANDROID_CERT_SHA256` (colon-hex, comma-separated; debug and release keys need separate entries).
- `/.well-known/assetlinks.json` is served from `MOBILE_ANDROID_PACKAGE_NAME` + `MOBILE_ANDROID_CERT_SHA256` (relations `handle_all_urls` and `get_login_creds`); `/.well-known/apple-app-site-association` from `MOBILE_IOS_APP_IDS` (`<TeamID>.<bundle id>`, adds `webcredentials.apps`). Both answer 404 until set.

### Not verified

- Nothing was run on a device or simulator: the OS sheet, Face ID/biometric prompt, associated-domain/asset-link verification, the Android origin hash, and a development build containing the native module. Only Jest (native module mocked) and `tsc` were run.
- That the deployed server equals the uncommitted working tree read here.

### What the owner still must supply

- Android package name and signing-certificate SHA-256 (server `MOBILE_ANDROID_*`; app `EXPO_PUBLIC_ANDROID_PACKAGE` if different from the placeholder `com.kuraykaraaslan.boilerplate`), iOS Team ID and bundle id (`MOBILE_IOS_APP_IDS`, `EXPO_PUBLIC_IOS_BUNDLE_ID`), the RP domain (`EXPO_PUBLIC_PASSKEY_RP_ID` = `WEBAUTHN_RP_ID`), a paid Apple Developer team for associated domains, an EAS/dev build, and deploying the server changes. No identifier was invented; all are empty or the pre-existing placeholders.

### Review fixes 2026-10-10

- A usernameless verify that answers 404 `PASSKEY_NOT_REGISTERED` (passkey deleted on the server, still on the device) was reported as "organization unavailable"; only a 404 with free text (`Tenant not found or inactive`) is the tenant now, a constant uses its own translation.
- `signInWithPasskey` re-checks the organization and sign-in state after the options arrive, so the OS sheet never opens for an organization the user already left.
- A `null` `authenticatorAttachment` from the OS no longer fails the attestation/assertion parse.
- `PasskeysCard` closes an open rename/remove dialog when the organization changes.
- Checked and fine: static web export builds (`expo export -p web` with the env from `.env.example`; the native module is only touched after the `Platform` and `NativeModules.Passkey` guards); all `PASSKEYS.*`, `AUTH_UI.PASSKEY_*` and `API_ERRORS.PASSKEY_*` keys exist in the six locales.
- Differences from the hand-over summary (Q3): `/auth/device/passkey/login/options` answers the WebAuthn request options, not the device-login body (only `/verify` returns the device-login body, plus session extensions); the options route takes `{ email? }` and the verify route adds an optional `device`; rename's 400 uses `{ error }`, the rest `{ message }`.
