<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/auth/server (totp/otp routes + dto) · modules/account (auth/me/security)
  3. phases/README.md
  4. phases/auth_security/README.md (S2)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 10 — Security screen and two-factor management

**Goal:** A user can see their security state, enable and disable authenticator-app (TOTP) 2FA, manage OTP delivery channels, and optionally lock the app behind biometrics.

Modules: `user_security`, `auth` (totp/otp), `account`. Priority 1. No server change expected.

## 10.1 Contract check

- [ ] Read `GET /auth/me/security` response (TOTP enabled, OTP methods, password age, lock state) and the totp/otp DTOs; align `services/auth/auth.dto.ts` or add `services/auth/security.dto.ts` (K6).
- [ ] Confirm the `setup` response (secret, `otpauth://` URI, recovery codes?) and what `enable` / `disable` require (code, password).
- [ ] Confirm the per-tenant policy (MFA methods allowed) is exposed so the screen hides disabled methods.

## 10.2 Screens

- [ ] `app/(drawer)/settings/security.tsx`: status cards (2FA, password age, active sessions link, linked accounts link), entry to change password (exists).
- [ ] **TOTP enable flow:** `setup` → show the secret and a QR (render the `otpauth://` URI with an SVG QR library) plus an "Open in authenticator app" button (`Linking.openURL(otpauth)`) and a copy action; ask for the 6-digit code → `enable`. Show recovery codes once, with a copy/share action and a confirmation checkbox.
- [ ] **TOTP disable:** confirm with code/password as the server requires.
- [ ] **OTP channels** (email / SMS) if the server exposes preference toggles; otherwise display only.
- [ ] Respect `mustChangePassword` and the Phase 4 session flags; never reachable while an OTP challenge is pending.

## 10.3 Biometric app lock (client-only, S2)

- [ ] Add `expo-local-authentication`. Setting "Require biometrics" stored in MMKV (not a secret).
- [ ] Lock on cold start and after N seconds in background; the lock screen only unlocks the UI — a failed biometric falls back to the device passcode, never to server logout.
- [ ] iOS `NSFaceIDUsageDescription` in `app.config.ts`.

## Files touched / created

- New: `app/(drawer)/settings/security.tsx`, `services/auth/security.{dto,service.client}.ts`, `libs/appLock.ts`, `components/security/*` (QR, recovery codes)
- Changed: `app/(drawer)/settings/_layout.tsx`, drawer entries, `app.config.ts`, `locales/*.json`, `package.json`
- Test: TOTP enable/disable with MSW shapes, recovery-code display-once, lock/unlock state machine

## Reuse

- Phase 4 OTP/2FA screens and session flags; `sessions.tsx`, `social-accounts.tsx`, `change-password.tsx`; `libs/haptics`; `@/components/ui` `Card`, `Switch`, `Input`, `Modal`, `Alert`.

## Acceptance criteria

- A user enables TOTP with a real authenticator app, signs out, and is challenged at the next sign-in.
- Disabling TOTP requires the confirmation the server demands and the next sign-in no longer challenges.
- Recovery codes are shown exactly once and never persisted on the device or logged.
- Biometric lock engages on resume and a cancel keeps the UI locked without ending the session.
- `npm run registry:snapshot` is up to date.

## Risks

- **Secret exposure.** The TOTP secret and recovery codes must never reach logs, Sentry breadcrumbs or persisted stores.
- **Lockout.** Disabling the only second factor or the app lock failing on a device with no biometrics enrolled must have a safe fallback.
- **QR dependency.** A native QR component adds a dependency; prefer an SVG-only library compatible with SDK 57.

---

## ✅ CODED — 2026-10-08

Committed straight to `main` (`cd47626`). Typecheck 0 errors, jest 144/144 (9 new), web export OK.

**Corrections to this plan**
- **No new service work**: `setupTOTP` / `enableTOTP` / `disableTOTP` / `getSecurity` and their DTOs already matched the server from Phase 3. Contract read: `setup` takes `{}` (400 "TOTP already enabled" if on) and answers `{secret, otpauthUrl}`; `enable` takes a 6-digit `otpToken` and answers `{backupCodes}`; **`disable` needs only a current 6-digit code — not the password** (the plan said "code/password").
- **There is no OTP-channel preference route.** `user_security` has no routes and the OTP methods in `GET /auth/me/security` are read-only facts (`otpMethods`), so 10.2's "OTP channels toggles" is not buildable; only the TOTP state is shown.
- **No QR code.** The plan asked for one, but the QR would be shown on the same phone that has to scan it. The flow is instead "Open in authenticator app" (`otpauth://` deep link) plus the secret in groups of four with a copy button — which also avoids a new QR dependency.

**What shipped**
- `app/(drawer)/settings/security.tsx` (+ a Security tile on the settings hub): two-step status, enable/disable, last sign-in, app lock.
- `components/security/TotpSetupModal`: setup → secret + open-in-app + copy → confirm code → backup codes shown once with copy and an explicit "I've saved them"; `TotpDisableModal` asks for a current code. The secret and codes live in component state only (never stored or logged).
- **App lock (S2)**: `libs/appLock.ts` (persisted on/off in MMKV; a cold start with it on begins locked; locks after 30 s in the background; `shouldLock` is pure and tested), `libs/biometrics.ts` (expo-local-authentication; any device screen lock counts, so passcode-only devices work), `libs/useAppLockWatcher.ts` (AppState), `AppLockScreen` overlay mounted in the drawer layout, `AppLockCard` toggle (turning it on requires a successful prompt first). Cancel keeps it locked; the only other exit is **Sign out**. Logout resets the lock so the next account does not inherit it.
- New deps: `expo-clipboard`, `expo-local-authentication` (+ the config plugin with the Face ID string). Strings in all six locales.
- Screenshots: `.junk/screenshots/phase-10-security-2fa/` (9 images, local).

**Deliberate deviations**
- No voluntary "change password" entry: `/change-password` sits in the `(auth)` group, whose guard bounces signed-in users, so it is only reachable in the forced flow. A settings entry needs the screen moved to a signed-in group — left for a follow-up.
- No trusted-devices list / recovery-code regeneration: no matching routes in the module list.
- The grace period (30 s) is a constant, not a setting.

**Not verified:** nothing was run against a live server, on a device, or with real biometrics (the screenshots use a web build with an in-memory SecureStore and a stand-in for expo-local-authentication). A development build is required for the config plugin (Face ID string); `otpauth://` hand-off to a real authenticator app was not exercised.
