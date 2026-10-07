<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference
  3. phases/README.md (§Locked decisions)
  4. phases/auth/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 4 — Core auth screens

**Goal:** the login → (OTP) → session flow must work end to end; the session must survive the app being closed and reopened.

## 4.1 Login

- [ ] `app/(auth)/login.tsx` → `AuthClientService.deviceLogin({ email, password, rememberMe, device: buildDeviceInfo() })`.
- [ ] Response handling order:
  1. `accessToken` + `refreshToken` → `setToken(kind, tenantId, value)` (with the active tenant's key).
  2. `otpRequired === true` → redirect to `/2fa`, **do not mark `authStore` as authenticated**.
  3. `mustChangePassword === true` → force the change-password screen.
  4. If `passwordExpiresInDays` is low, show a warning toast.
  5. `user` → `authStore.setUser`, `tenant` + `tenantMember` → `tenantStore`.
- [ ] Error paths via `normalizeApiError`: `INVALID_CREDENTIALS`, 403 "not a member of this organization", 404 tenant inactive, 429 `Retry-After`.
- [ ] `Haptics.notificationAsync(Success | Error)` (AGENTS.md §6 Rule 11), `toast.success/error` (Rule 12).
- [ ] Buttons / fields are the kui-native `Button`, `Input`, `Label`, `AlertBanner` exposed from the `@/components/ui` barrel in Phase 1C (no direct `kui-native/*` imports).

## 4.2 OTP / 2FA

- [ ] `app/(auth)/2fa.tsx` → `verifyOTP({ method, action: 'authenticate', otpToken })`. Today's `{code, method}` body is **wrong**.
- [ ] Method selection comes from `userSecurity.otpMethods` (`EMAIL` / `SMS` / `TOTP_APP`); if there is only one method, no selection is shown.
- [ ] Resend: `sendOTP({ method, action: 'authenticate' })`, a button with a countdown.
- [ ] After verification the session is refreshed with `GET /auth/session` and the user enters the drawer.

## 4.3 Registration and password

- [ ] `app/(auth)/register.tsx` → `{ email, password, phone?, consentVersion? }`. Today's required `name` field is **removed** from the form (the server does not accept it); if wanted, it is collected in a separate step after registration via `PUT /auth/me/profile`.
- [ ] `consentVersion` — the KVKK / GDPR consent version; kept as a constant under `constants/` and sent when the consent checkbox is ticked.
- [ ] `app/(auth)/forgot-password.tsx` → `POST /auth/forgot-password`.
- [ ] `app/(auth)/reset-password.tsx` (**new**) → `{ email, resetToken, password }`. `resetToken` is read from the deep link in the email.
- [ ] Change password (the `mustChangePassword` flow) → `POST /auth/change-password` `{currentPassword, newPassword}`.

## 4.4 Session restore

- [ ] `app/_layout.tsx` → if the active tenant has an `accessToken`, it is verified with `GET /auth/session`:
  - 200 → `authStore.setUser`, `tenantStore` is refreshed.
  - 401 `OTP_REQUIRED` → `/2fa`.
  - 401 (other) → the interceptor already tried a refresh; if we land here, the tokens are cleared and we go to login.
- [ ] The splash closes only after this check finishes (tied to today's `loaded` flag) — otherwise the login screen appears for a moment and disappears.

## 4.5 Active sessions

- [ ] `app/(drawer)/settings/sessions.tsx` → `GET /auth/me/sessions`; each row shows `metadata.device` (`brand`, `model`, `os`, `osVersion`) and `metadata.geo`, falling back to `userAgent` if absent.
- [ ] The current session is marked; the others are terminated with `DELETE /auth/me/sessions/{id}`.
- [ ] If the user terminates their own session, they fall into the logout flow.

## 4.6 New source of profile fields

- [ ] `SafeUser` no longer has `name` / `image`. The `UserMenu` initials and the profile header are wired to `userProfile.name` / `userProfile.profilePicture` (`services/user/profile.dto.ts` already models them).
- [ ] `language` / `theme` are read from `GET /auth/me/preferences`; synced with `appStore.locale` / `colorScheme`.
- [ ] `app/(drawer)/settings/change-email.tsx` → there is **no** `/auth/change-email`; it is wired to the `POST /auth/me/complete-email` + `POST /auth/verify-email/send|verify` flow.

## Files touched / created

- New: `app/(auth)/reset-password.tsx`
- Changed: `app/(auth)/{login,register,2fa,forgot-password}.tsx`, `app/_layout.tsx`, `app/(drawer)/settings/{sessions,change-email,profile,index}.tsx`, `components/shell/UserMenu.tsx`, `components/auth/AuthLayout.tsx`, `stores/authStore.ts`, `constants/` (consent version)
- Test: login / OTP / session-restore flow tests under `__tests__/`

## Reuse

- `components/auth/AuthLayout.tsx` — the shared frame of the auth screens, not rewritten.
- `@/components/ui` (kui-native, Phase 1C): `Button`, `Input`, `Label`, `AlertBanner`, `Spinner`, `Card`, `EmptyState`.
- `libs/apiError.ts` + `services/common.dto.ts:extractErrorMessage` — all error messages.
- `libs/deviceInfo.ts` (Phase 2) — the `device` in the login body.
- `libs/i18n.ts` + `locales/*.json` — the `AUTH`, `ERRORS`, `SETTINGS` namespaces already exist; new keys are added to all six languages.
- `expo-haptics`, `sonner-native` — existing usage pattern.

## Acceptance criteria

- Wrong password → `INVALID_CREDENTIALS` message and error haptic.
- Login to a tenant the user is not a member of → 403 message ("bu organizasyonun üyesi değilsiniz"), user stays on the login screen.
- Inactive tenant → 404 message, redirect to `/select-tenant`.
- A user with OTP enabled lands on `/2fa`; after the correct code they enter the drawer, with a wrong code they stay on the screen.
- A user with `mustChangePassword` **cannot** enter the drawer without changing their password.
- The session survives closing and reopening the app; the splash does not "flash" the login screen.
- The `sessions` screen shows device brand / model / OS information (the `device` object sent by Phase 2).
- The `UserMenu` initials and profile name are populated (from `userProfile`).
- The new text keys exist in all six languages; `npm run test:ci` passes.

## Risks

- **Not shipping together with Phase 3:** the moment `name`/`image` leave `SafeUser`, these screens render empty. The two phases must go back to back without breaking the order.
- **Skipping `otpRequired`:** marking `authStore` as authenticated while OTP is required lets the user into the drawer and **every** request returns 401 `OTP_REQUIRED` — an endless error loop.
- **Token write order:** if `setUser` is called before the token is written, the next `GET /auth/session` request goes out without a bearer and gets 401.
- **Deep link `resetToken`:** the link scheme (`scheme` in `app.config.ts`) is added in Phase 6; the reset-password link cannot be tested before it → this phase must also offer a field where the token can be entered manually.
- **Missing i18n key:** if a new key is added only to `en`/`tr`, the raw key shows in the other four languages.
- **Forgetting the `consentVersion` constant:** if sent empty the server accepts it but the KVKK record is left without a trace — loss of the legal trail, a silent failure.

---

## ✅ CODED — 2026-10-07

Branch `feat/auth-screens`. Typecheck 0 errors, jest 88/88 (18 new in `__tests__/auth-flow.test.ts`), web export includes the new routes.

**What shipped**
- **Forced password change.** `authStore.mustChangePassword` (persisted) is set by `startDeviceSession` from the login reply and cleared on a clean login. `(drawer)/_layout` redirects to `/change-password` while it is set; `(auth)/_layout` keeps a signed-in user in the group for it, the same way it does for OTP. The screen asks for current + new + confirm, and its only exit besides success is "Sign out".
- **Expiry warning.** `passwordExpiresInDays` from the login reply shows a plural-aware warning toast.
- **Login error paths.** A 404 (tenant gone or inactive) goes to `/select-tenant` with a toast; a 403 (not a member) stays on login with the server's message through `handleApiError`.
- **OTP.** `userSecurity.otpMethods` is kept in `authStore.otpMethods` while the gate is closed. The method picker only appears with more than one method; `TOTP_APP` skips the send step; email/SMS resend is disabled behind a 30 s countdown (`libs/useCountdown.ts`). When enrolment is unknown (gate hit on a restored session) it offers email and SMS.
- **Register / forgot / reset.** `constants/legal.ts` holds `CONSENT_VERSION`, sent on every sign-up. New `app/(auth)/reset-password.tsx` takes `{email, resetToken, password}` with a manual token field (prefilled from `email` / `resetToken` params); forgot-password links to it after the mail is sent. `AuthFooterLink` now also accepts `onPress`.
- **Session restore.** The splash stays up until restore finishes (`finally` in `restoreSession`), so a signed-in user never sees login flash by.
- **Sessions.** `utils/session.ts#describeSession` prefers `metadata.device` (+ OS) and `metadata.geo`, falling back to the user agent. The current session is the one whose id is in the access token (`getSessionIdFromToken`) and is badged "This device"; revoking it is a sign-out (`libs/logout.ts`) with its own confirm copy.
- **Preferences.** `libs/preferences.ts`: `pullPreferences()` runs once the drawer is open (server wins for `language` / `theme`; a language without a translation is ignored); `pushPreferences()` is called from the preferences card, best effort, never undoing the local change.

**Deliberate deviations:**
- **No change-email screen** (already removed in Phase 3). `POST /auth/me/complete-email` exists but only replaces the *placeholder* address of SSO / national-ID accounts; there is no general change-email route.
- **Wrong current password on change-password is a 401 `INVALID_CREDENTIALS`.** It is not in the refresh or session-end lists, so the transport passes it through (covered by a test: no refresh, session intact).
- **Tokens-before-user is asserted in a test**, as the risks section asked.
- **New strings were added to `en` and `tr` only.** `de`, `es`, `fr`, `it` have no `AUTH_UI` namespace at all (a gap from Phase 1D, not new here) and fall back to English; translating the whole namespace is a separate task.

**Not verified:** nothing here was run against a live next-boilerplate or an emulator; the reset link cannot be tested end to end until Phase 6 adds a deep-link scheme.
