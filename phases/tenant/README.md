<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/tenant/server/tenant.{dto,types}.ts · modules/account (auth/me/tenants) ·
     modules/user_session/server/user_session.token.service.ts (TokenPayload.tenantId)
  3. phases/README.md (§Locked decisions K1–K2)
  4. phases/tenant/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# tenant — tenant selection, switching and creation (Phase Plan index)

> **This is not a new module.** It rewires the existing `stores/tenantStore.ts`, `services/tenant/tenant.service.client.ts`
> and `app/(tenant)/{select-tenant,create-tenant}.tsx` screens to the device token's tenant binding.

## Why (context)

A device token is bound to **a single tenant** (`TokenPayload.tenantId`) and is rejected by other tenants' routes. For the device flow, the server **deliberately** offers no tenant-switch endpoint — its comment says verbatim: *"a device install is expected to hold one tenant's credentials at a time"*.

This has two consequences, and neither is solved in the client today:

1. **Bootstrap chicken-and-egg problem.** Login requires a tenantId in the URL, while the tenant list (`GET /auth/me/tenants`) requires an existing session. The server has **no** unauthenticated tenant discovery surface (no tenant endpoint in the `/api/public/*` scan; `GET /api/tenants` requires GLOBAL scope).
2. **Switching problem.** Switching tenants means obtaining **a new token pair** for that tenant.

In addition, `MyTenantsResponseSchema` today says `{tenants, invitations}`; the server returns `{tenants, delegatedTenants, pendingInvitations}`.

## Order

| Phase | File | Topic | Priority |
|-----|-------|------|---------|
| 5 | [phase-5-tenancy-core.md](phase-5-tenancy-core.md) | Tenancy core | ✅ Coded 2026-10-07 |
| 7 | [phase-7-members-invitations.md](phase-7-members-invitations.md) | Members and invitations | 🟡 Coded except accept/decline |

## Locked decisions

- **K1 — Bootstrap via config.** `EXPO_PUBLIC_DEFAULT_TENANT_ID` is a required env var. A fresh install logs in to this tenant, then fetches the real membership list.
- **K2 — A token pair per tenant.** SecureStore keys are `accessToken:{tenantId}` / `refreshToken:{tenantId}`. Switching to a previously entered tenant **does not ask for a password**; switching to a never-entered tenant asks for a login for that tenant. Trade-off: N refresh tokens sit on the device, so `logout` and `flush()` must delete **all** of them.
- **`activeTenantId` is the single source.** Transport (the Phase 2 interceptor) reads only `tenantStore.activeTenantId`; the tenant path is built nowhere else.
- **Members / invitations / roles were out of scope for Phase 5.** `app/(drawer)/settings/tenant/{members,invitations}.tsx` and the related service methods were left untouched there; **Phase 7 now covers members and invitations**. Role editing and the permission matrix still stay on the web.

## Dependency graph (summary)

- Phase 5 depends on Phase 2's per-tenant SecureStore keys and the `activeTenantId` field.
- Phase 5 depends on Phase 3's corrected `MyTenantsResponseSchema` and `SafeTenant` schemas.
- Phase 5 **reuses** Phase 4's login flow — no separate login implementation is written for tenant switching.
- Phase 6 (SSO) depends on Phase 5's `activeTenantId` concept (`state = "{tenantId}.{uuid}"`).

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
