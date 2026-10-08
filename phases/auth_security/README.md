<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/auth (totp/otp routes) · modules/account (auth/me/security) · modules/auth_passkey · modules/user_security
  3. phases/README.md (§Locked decisions K4)
  4. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# auth_security — second factor management and passkeys (Phase Plan index)

## Why (context)

Phase 4 signs in with email + password and handles the OTP/2FA challenge. What is missing is **managing** the second factor and a passwordless option.

- `user_security` has **no routes of its own** (`module.json` lists none). The surface is `auth` (`/api/auth/totp/{setup,enable,disable}`, `/api/auth/otp/{send,verify}`) plus `account` (`GET /api/auth/me/security`).
- `auth_passkey` routes exist (`/api/auth/me/security/passkeys*`, `/api/auth/passkey/login/{options,verify}`), but `login/verify` **sets `accessToken`/`refreshToken` cookies** through `createSession` — the same web-audience problem as K4 — and WebAuthn on native needs the RP ID bound to the app (assetlinks / apple-app-site-association).

## Order

| Phase | File | Topic | Priority |
|-----|-------|------|---------|
| 10 | [phase-10-security-2fa.md](phase-10-security-2fa.md) | Security screen, TOTP, OTP channels, biometric app lock | ✅ Coded 2026-10-08 |
| 11 | [phase-11-passkey.md](phase-11-passkey.md) | Passkeys (**needs a server change**) | ⬜ Pending |

## Locked decisions

- **S1 — Passkey login is blocked on the server (K4 class).** The client does not parse cookies or fake a device session. The server must return a device-audience pair for a device client before Phase 11 codes the login half.
- **S2 — Biometric app lock is client-only.** It gates the UI on resume; it never replaces the server session and never stores credentials.
- **S3 — Device-bound passkeys are registered per account, not per tenant.** Verify the credential scope on the server before building the list screen.

## Dependency graph (summary)

- Phase 10 depends on Phase 4 (OTP/2FA screens, session flags).
- Phase 11 depends on Phase 10 (security screen) and a server change; it also needs a development build (native module).

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
