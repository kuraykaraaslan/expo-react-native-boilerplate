<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference
  3. phases/README.md (§Locked decisions K1–K2)
  4. phases/tenant/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 5 — Tenancy core

**Goal:** Tenant selection, switching and creation must work end to end; a user who is a member of multiple tenants must be able to switch between two of them without being asked for a password.

## 5.1 Store

- [ ] `stores/tenantStore.ts` fields:
  - `activeTenantId: string | null` — **the single source transport reads** (Phase 2 interceptor).
  - `selectedTenantMembership: TenantMember | null` (existing)
  - `memberships: TenantMember[]` (existing)
  - **New** `delegatedTenants: []`, `pendingInvitations: []`
  - **New** `knownTenantIds: string[]` — for SecureStore key cleanup (Phase 2's `clearAllTokens` reads it).
- [ ] Actions: `setMemberships`, `selectMembership`, `setActiveTenant(tenantId)`, `flush()`.
- [ ] `flush()` deletes **all** tenants' tokens (`clearAllTokens`) and empties `knownTenantIds`.
- [ ] On first launch, if `activeTenantId` is empty it falls back to `env.EXPO_PUBLIC_DEFAULT_TENANT_ID` (K1).

## 5.2 Tenant selection

- [ ] `app/(auth)/select-tenant.tsx` → `GET /auth/me/tenants`.
  - Response `{tenants, delegatedTenants, pendingInvitations}` — all three are written to the store.
  - The list puts those with `memberStatus === 'ACTIVE'` first; `INACTIVE` / `SUSPENDED` / `PENDING` are grouped separately and are not selectable.
  - Those with `tenant.tenantStatus !== 'ACTIVE'` are flagged and not selectable (login already returns 404).
- [ ] Pending invitations are shown, but **accepting/declining is outside the scope of this phase** (invitations set) — only the "N bekleyen davetiniz var" notice.
- [ ] The empty-list state uses `EmptyState`: "Hiçbir organizasyona üye değilsiniz" + the "Organizasyon oluştur" action.

## 5.3 Tenant switching (K2)

- [ ] For the selected tenant, `getToken('accessToken', tenantId)` is checked:
  - **Token exists** → `setActiveTenant(tenantId)`, verify with `GET /auth/session`, enter the drawer. **No password is asked.**
  - **No token** → the login screen opens for that tenant (`/login?tenantId=...`); a successful login writes that tenant's pair via `deviceLogin`.
  - **Token exists but `GET /auth/session` returns 401** → the interceptor tries a refresh; if that also fails, the token is cleared and we fall to login.
- [ ] After switching, `authStore.user` is refreshed — even if the user is the same, `tenantMember.memberRole` changes per tenant.
- [ ] The active tenant name is shown in the drawer and a quick switch opens from it (`UserMenu` or the `DrawerContent` header).

## 5.4 Tenant creation

- [ ] `app/(auth)/create-tenant.tsx` → `POST /tenants/create` body `{name, description?, region?}`.
  - Response `{success, tenant: {tenantId, name, description, tenantStatus}, message}`; the creating user becomes `OWNER`.
  - On success: **a login is required** for the new tenant (there is no token for the new tenant) → sign in to that tenant with `deviceLogin` and make it the active tenant.
- [ ] The `region` field comes from the server's `TenantRegionSchema` enum; default `TR`.
- [ ] The screen must be defined in the `Stack.Screen` list in `app/(auth)/_layout.tsx` (added in Phase 0).

## 5.5 Tenant profile

- [ ] `app/(drawer)/settings/tenant/index.tsx` → `GET /tenant/profile` (`{name, description}`), `PUT /tenant/profile` (`UpdateOwnTenantProfileDTO`).
- [ ] Only `OWNER` / `ADMIN` can edit; if `memberRole` is `USER`, the fields are read-only.
- [ ] `tenantStatus`, `region` and the membership role are shown as information.

## Files touched / created

- Changed: `stores/tenantStore.ts`, `app/(auth)/{select-tenant,create-tenant,login}.tsx`, `app/(drawer)/settings/tenant/index.tsx`, `components/shell/{DrawerContent,UserMenu}.tsx`, `services/tenant/tenant.service.client.ts`, `libs/secureStorage.ts` (`knownTenantIds` integration)
- Test: tenant switching (token present / absent), `flush()` cleanup, inactive-tenant rejection under `__tests__/`

## Reuse

- **Phase 4's login flow** — the login in tenant switching is not a separate implementation; the same screen opens with a `tenantId` parameter.
- `libs/secureStorage.ts` per-tenant keys (Phase 2) — all of the switching mechanics rest on this.
- `libs/axios.ts` interceptor's `TENANT_INACTIVE` / `NOT_TENANT_MEMBER` redirection (Phase 2) — screens do not catch these errors separately.
- `services/tenant/tenant.dto.ts` (aligned in Phase 3) — `SafeTenant`, `MyTenantsResponseSchema`.
- `@/components/ui` (kui-native, Phase 1C): `Card`, `Badge`, `EmptyState`, `Avatar`, `Select`, `Spinner`.
- `app/(drawer)/settings/tenant/{members,invitations}.tsx` — **untouched**, out of scope.

## Acceptance criteria

- A user who is a member of two tenants switches between them **without being asked for a password** after logging in to each once.
- When a never-entered tenant is selected, a login is requested for that tenant and the active tenant changes on successful sign-in.
- A suspended tenant cannot be selected; if forced, `TENANT_INACTIVE` is caught and we return to the selection screen.
- After `logout`, **no** tenant's token remains on the device (tested with SecureStore verification).
- A user who creates a new tenant enters that tenant as `OWNER`.
- A member with the `USER` role **cannot edit** the tenant profile (fields are read-only).
- A user with no memberships is shown the empty-state screen and the "Organizasyon oluştur" action.
- After `npm run registry:snapshot`, the catalog is up to date.

## Risks

- **Session leak (most critical):** if `logout` deletes only the active tenant's token, the other tenant's refresh token stays alive on the device for **7 days**. If the `knownTenantIds` list is not kept current this happens silently — it must be closed off with a test.
- **`activeTenantId` / token mismatch:** if tenant A is active in the store but tenant B's token is read from SecureStore, **every** request returns 401. Reads must always use the same key as `activeTenantId`.
- **Empty bootstrap:** if `EXPO_PUBLIC_DEFAULT_TENANT_ID` is a wrong / inactive uuid, the app becomes impossible to log in to on first launch and shows the user a meaningless 404 → env validation and a clear error message are mandatory.
- **Role mix-up on switching:** `tenantMember.memberRole` is tenant-specific; if it is not refreshed on switching, the user appears as ADMIN in the wrong tenant and screens they have no authority for open.
- **Invitation display causing scope creep:** if an accept/decline button is added while showing the "pending invitations" list, we step out of scope; in this phase **only information** is shown.
