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
