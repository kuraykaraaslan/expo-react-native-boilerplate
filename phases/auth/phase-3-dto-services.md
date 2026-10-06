<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/auth/module.json · modules/auth/server/auth.dto.ts ·
     modules/user/server/user.types.ts · modules/user_security/server/user_security.types.ts ·
     modules/user_session/server/user_session.types.ts · modules/tenant/server/tenant.types.ts
  3. phases/README.md (§Locked decisions)
  4. phases/auth/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 3 — DTO + service alignment

**Goal:** Zod schemas must be an exact mirror of the server's `Safe*` schemas; services must call the real paths. After this phase no `.parse()` breaks on a server response.

## 3.1 `services/auth/auth.dto.ts`

- [ ] `UserSchema` / `SafeUserSchema` → the server's `SafeUser`:
  - **Incoming (added):** `userStatus`, `emailVerifiedAt`, `userProfile?`
  - **Outgoing (dropped):** `name`, `image`, `language`, `theme` — these are not in `SafeUser`. `name` + `profilePicture` live under `userProfile` (`services/user/profile.dto.ts` already models it), `language` / `theme` live under `/auth/me/preferences`.
  - Remaining: `userId`, `email`, `phone` (nullable), `userRole`, `createdAt`, `updatedAt`.
- [ ] **New** `DeviceInfoSchema` — `{type?: 'phone'|'tablet'|'watch'|'tv'|'desktop'|'other', brand?, model?, name?, os?, osVersion?, appVersion?}`; identical to `DeviceInfoDTO`, including length limits (`brand`/`model` ≤80, `name` ≤120, `os`/`osVersion`/`appVersion` ≤40).
- [ ] **New** `DeviceLoginRequestSchema` = `LoginRequestSchema.extend({ captchaToken: optional, rememberMe: optional, device: DeviceInfoSchema.optional() })`.
- [ ] **New** `DeviceLoginResponseSchema` — the real nine fields of login: `{accessToken, refreshToken, otpRequired, user, tenant: {tenantId, name}, tenantMember: {memberRole}, userSecurity, mustChangePassword, passwordExpiresInDays}`.
- [ ] **New** `DeviceRefreshResponseSchema` = `{message, accessToken, refreshToken}`.
- [ ] `UserSecuritySchema` → the server's `SafeUserSecurity`: `{otpMethods[], lastLoginAt, lastLoginIp, lastLoginDevice, failedLoginAttempts, lockedUntil, passkeyEnabled, trustedDevices[], passwordChangedAt, mustChangePassword}`. Today's `{totpEnabled, otpMethods, passkeyCount, otpVerifyNeeded}` is **wrong**.
- [ ] Add `SessionSchema.metadata` → `{geo?: {city,state,country,countryCode}, impersonation?, rememberMe?, device?}` (mirror of `SessionMetaSchema`).
- [ ] `OTPVerifyRequestSchema` → `{method: OTPMethodEnum, action: OTPActionEnum, otpToken: string().min(4)}`. **New** `OTPActionEnum = ['enable','disable','authenticate']`.
- [ ] `OTPSendRequestSchema` → `{method, action}` (today only `method`).
- [ ] **New** `ResetPasswordRequestSchema` = `{email, resetToken, password}` — the server route itself maps the `password` field to `ResetPasswordDTO.newPassword`; the client must send `password`.
- [ ] **New** `ChangePasswordRequestSchema` = `{currentPassword, newPassword: min(8)}`.
- [ ] **New** `MagicLinkRequestSchema` = `{email}`, `MagicLinkConsumeSchema` = `{token: min(16).max(512)}`.
- [ ] **New** `TOTPSetupResponseSchema` = `{message, secret, otpauthUrl}`, `TOTPEnableResponseSchema` = `{message, backupCodes}`.
- [ ] `ChangeEmailRequestSchema` is **removed** — `/auth/change-email` does not exist on the server.
- [ ] `RegisterRequestSchema` → `{email, password: min(8), phone?: optional, consentVersion?: optional}`. Today's required `name` is **removed** (not in the server's `RegisterDTO`).

## 3.2 `services/tenant/tenant.dto.ts`

- [ ] `TenantSchema` → `SafeTenant`: `{tenantId, name, description (nullable), region?, slug?, metadata?, tenantStatus, createdAt, updatedAt, domains?}`. Today's `logo`, `favicon`, `theme`, `language`, `timezone` fields are **not** in `SafeTenant` — they live under `tenant_branding` / `tenant_setting`, out of scope.
- [ ] `MyTenantsResponseSchema` → `{tenants, delegatedTenants, pendingInvitations}` (today `{tenants, invitations}` — **both fields are misnamed**).
- [ ] `CreateTenantRequestSchema` → `{name: min(1).max(100), description?: nullable, region?}`; aligned with the server's `CreateTenantDTO` (today's `min(2)` is relaxed).
- [ ] `MemberRoleEnum` → `['OWNER','ADMIN','USER']` keeps the same order as on the server.

## 3.3 `services/auth/sso.dto.ts` (new)

- [ ] `SSOProviderEnum` — `google, apple, facebook, github, linkedin, microsoft, twitter, slack, tiktok, wechat, autodesk, yandex, vk, qq, weibo, alipay`.
- [ ] `SSOProvidersResponseSchema` = `{providers: [...]}`.
- [ ] `SSOAuthUrlResponseSchema` = `{url, state}`.

## 3.4 Services

All `/api/system/...` paths are **deleted**. Paths are written **relative** to the Phase 2 interceptor prefix.

- [ ] `services/auth/auth.service.client.ts` → `AuthClientService`:

  | Method | Path | Note |
  |---|---|---|
  | `deviceLogin(payload)` | `POST /auth/device/login` | replaces `login` |
  | `deviceRefresh(refreshToken, tenantId)` | `POST /auth/device/refresh` | used only by the interceptor |
  | `logout()` | `POST /auth/logout` | |
  | `register(payload)` | `POST /auth/register` | |
  | `getSession()` | `GET /auth/session` | response `{success, user, tenant, tenantMember, message}` |
  | `sendOTP(method, action)` | `POST /auth/otp/send` | |
  | `verifyOTP(method, action, otpToken)` | `POST /auth/otp/verify` | |
  | `setupTOTP()` / `enableTOTP(otpToken)` / `disableTOTP(otpToken)` | `POST /auth/totp/{setup,enable,disable}` | **new** |
  | `forgotPassword(payload)` | `POST /auth/forgot-password` | |
  | `resetPassword(payload)` | `POST /auth/reset-password` | **new** |
  | `changePassword(payload)` | `POST /auth/change-password` | **new** |
  | `getSessions()` | `GET /auth/me/sessions` | |
  | `revokeSession(id)` | `DELETE /auth/me/sessions/{id}` | |
  | `changeEmail` | — | **removed** |

- [ ] `services/user/profile.service.client.ts` → `GET|PUT /auth/me/profile`; **new** `getPreferences()` / `updatePreferences()` → `GET|PUT /auth/me/preferences` (`language`, `theme` come from here).
- [ ] `services/tenant/tenant.service.client.ts` → `getMyTenants()` `GET /auth/me/tenants`, `createTenant()` `POST /tenants/create`, **new** `getTenantProfile()` / `updateTenantProfile()` `GET|PUT /tenant/profile`. Members / invitations methods are **left untouched** (out of scope) — only the `/api/tenant/{id}` prefixes are removed so that the interceptor prefix works correctly.
- [ ] `services/auth/sso.service.client.ts` (new) → `getProviders()` `GET /auth/sso`, `getAuthUrl(provider)` `GET /auth/sso/{provider}`.
- [ ] Every service response is `.parse()`d with the relevant DTO (AGENTS.md §6 Rule 7), and errors are wrapped with `normalizeApiError`.

## 3.5 Test infrastructure

- [ ] `__tests__/_handlers.ts` — an MSW handler for every endpoint, with **the server's real response shape** (the tables in this document are the source).
- [ ] The four error-envelope shapes are added as fixtures.
- [ ] For every DTO, a "server response → `.parse()` does not break" test.

## Files touched / created

- New: `services/auth/sso.dto.ts`, `services/auth/sso.service.client.ts`
- Changed: `services/auth/auth.dto.ts`, `services/tenant/tenant.dto.ts`, `services/auth/auth.service.client.ts`, `services/user/profile.service.client.ts`, `services/tenant/tenant.service.client.ts`, `stores/authStore.ts` (new `SafeUser` shape), `__tests__/_handlers.ts`
- Affected (to be updated in Phase 4/5): `app/(auth)/**`, `app/(drawer)/settings/**`

## Reuse

- `services/user/profile.dto.ts` — the `userProfile` shape is already modeled (`name`, `biography`, `profilePicture`, `headerImage`, `socialLinks`); `SafeUser.userProfile` is wired to it, not rewritten.
- `services/common.dto.ts` — `PaginationSchema`, `paginatedResponseSchema`, `ApiErrorSchema` are kept.
- `libs/apiError.ts` (Phase 2) — all service errors pass through it.
- `libs/axios.ts` interceptor prefix — services **do not build** the tenant path themselves.
- The existing `__tests__/_server.ts` MSW setup.

## Acceptance criteria

- `git grep "/api/system"` → **zero** results.
- `git grep "api/tenant/"` in service files → **zero** results (the prefix lives only in the interceptor).
- For every service method, the MSW handler returns the server's real response and the DTO `.parse()` **does not throw**.
- `npm run typecheck` has zero errors; `npm run test:ci` passes.
- `UserSchema` no longer contains the `name` / `image` / `language` / `theme` fields.
- After `npm run registry:snapshot`, `public/registry/{dtos,services}.json` reflect the new shape.

## Risks

- **Silent field loss:** once `name` / `image` leave `SafeUser`, the screens that read them (`UserMenu` initials, profile header) render **empty**. Until they are wired to `userProfile` in Phase 4 there is temporary visual breakage — these two phases must be merged **in the same PR** or the order must not be broken.
- **`.parse()` strictness:** if the server sends `null` for an optional field, it breaks where `optional()` is expected. The `nullable()` / `nullish()` choices must be made by looking at the server schemas, not by guessing.
- **Missing `OTPActionEnum`:** an OTP call that does not send `action` returns 400 and the user is shown "Validation error" — verify with `git grep` that all three OTP call sites were updated.
- **Breaking out-of-scope methods:** if the path is cut wrongly while removing the `/api/tenant/{id}` prefix from the members / invitations methods, out-of-scope screens break; tests for these methods must also be added to the handlers.
- **`reset-password` field-name trap:** the server accepts `password` but its internal DTO uses `newPassword` — if the client sends `newPassword` it gets 400.
