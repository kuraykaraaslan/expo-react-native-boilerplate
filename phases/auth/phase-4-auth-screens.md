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
