<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/auth/module.json · modules/auth/server/auth.dto.ts ·
     modules/user/server/user.types.ts · modules/user_session/server/user_session.types.ts
  3. phases/README.md (§Locked decisions)
  4. phases/auth/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# auth — device bearer identity flow (Phase Plan index)

> **This is not a new module.** It aligns the existing `services/auth/auth.dto.ts`, `services/auth/auth.service.client.ts`, `stores/authStore.ts`
> and `app/(auth)/**` screens with the server's real contract. No screen is written from scratch.

## Why (context)

Today the client's auth layer speaks a **made-up contract**:

- All ten methods of `AuthClientService` call `/api/system/auth/*` — this path **does not exist at all** on the server.
- `UserSchema` = `{userId, email, name, phone, image, userRole, language, theme, …}`; the server's `SafeUser` = `{userId, email, phone, userRole, userStatus, emailVerifiedAt, createdAt, updatedAt, userProfile?}`. `name` / `image` / `language` / `theme` are **not in `SafeUser`**; they live under `userProfile` and `preferences`.
- `LoginResponseSchema` = `{user, userSecurity}`; the real device login response has **nine fields**.
- `OTPVerifyRequestSchema` = `{code, method}`; the server expects `{method, action, otpToken}` — two of the three fields differ.
- `ChangeEmailRequestSchema` exists but the server has **no** `/auth/change-email`.

In other words, without this set no auth call returns 200; even if it did, `.parse()` would break.

## Order

| Phase | File | Topic | Priority |
|-----|-------|------|---------|
| 3 | [phase-3-dto-services.md](phase-3-dto-services.md) | DTO + service alignment | ✅ `feat/dto-services` |
| 4 | [phase-4-auth-screens.md](phase-4-auth-screens.md) | Core auth screens | ⬜ Pending |

## Locked decisions

- **DTOs mirror the server's `Safe*` schemas.** The client does not invent fields for its own convenience; if a field is missing, it is fetched from its real source on the server (`userProfile`, `preferences`).
- **Service paths are relative to the interceptor prefix.** Services never write `/api/tenant/...`; they write `/auth/device/login`, and Phase 2's interceptor adds the prefix.
- **Tokens never enter Zustand** (AGENTS.md §6 Rule 5). `authStore` holds only `isAuthenticated` + `user`.
- **Members / invitations / roles are out of scope.** The related methods in `services/tenant/tenant.service.client.ts` are left **untouched** in this set; their paths only fix themselves thanks to the interceptor prefix.
- **The `change-email` screen is not deleted**; it is rewired to its real counterpart on the server (`/auth/me/complete-email` + `/auth/verify-email/*`).

## Dependency graph (summary)

- Phase 3 depends on Phase 2's interceptor prefix and `normalizeApiError`.
- Phase 4 depends on Phase 3's DTOs and Phase 1C's `@/components/ui` barrel (kui-native git package).
- Phase 5 (tenancy) and Phase 6 (SSO) depend on Phase 4's session-establishment flow.

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
