<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/tenant_member/{module.json,server/*.dto.ts} · modules/tenant_invitation/{module.json,server/*.dto.ts}
  3. phases/README.md (§Locked decisions K1–K2)
  4. phases/tenant/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 7 — Members and invitations

**Goal:** The members and invitations screens that were left untouched in Phase 5 talk to the real server routes with the real `Safe*` shapes, and a user can accept or decline a pending invitation from the app.

Modules: `tenant_member`, `tenant_invitation`. Priority 1.

## 7.1 Contract check (first, before any code)

- [ ] Read `tenant_member` and `tenant_invitation` `server/*.dto.ts` and the route files. Record corrections in this file the way Phase 3 did. Known starting points from `module.json`:
  - Members: `GET/POST /api/members`, `GET/PUT/DELETE /api/members/[memberId]`, `POST /api/members/[memberId]/transition`, `GET /api/members/[memberId]/activity`, `GET /api/members/report`.
  - Invitations: `GET/POST /api/invitations`, `DELETE /api/invitations/[invitationId]`, `POST …/remind`, `POST …/resend`, `POST /api/invitations/accept`, `POST /api/invitations/decline`.
  - Access control: `/api/access-control/{roles,matrix,role-templates}` — **read-only use at most** (role picker); role editing stays on the web admin.
- [ ] Confirm the accept/decline body (token? invitationId?) and whether it works with a device bearer token **for a tenant the user is not yet a member of**. If it needs a session in the inviting tenant, document the flow before building it (risk below).
- [ ] Confirm which member status transitions (`transition`) the device audience may call.

## 7.2 DTOs and services

- [ ] Align `services/tenant/tenant.dto.ts` members/invitation schemas with the server (`Safe*`), split into `services/tenant/member.dto.ts` / `invitation.dto.ts` only if the file gets unwieldy (K6: stay inside `services/tenant/`).
- [ ] Fix `getMembers`, `getMember`, `updateMember`, `removeMember`, `getInvitations`, `sendInvitation`, `revokeInvitation`, `acceptInvitation`, `declineInvitation`; add `resendInvitation`, `remindInvitation`, `transitionMember`.
- [ ] MSW handlers and tests with the server's real shapes (Phase 3 pattern).

## 7.3 Screens

- [ ] `app/(drawer)/settings/tenant/members.tsx` — paginated list, search, role badge, status badge; member detail sheet (role change, transition, remove) gated by role.
- [ ] `app/(drawer)/settings/tenant/invitations.tsx` — list with status, send form (email + role), revoke / resend / remind.
- [ ] Pending invitations from Phase 5 (`tenantStore.pendingInvitations`) gain **accept / decline** actions on `select-tenant`. After accepting, refresh the overview and route to `tenant-login` for that tenant if no token pair exists (K2).
- [ ] Deep link `…/auth/invitation/accept?token=` opens the same decision screen (`expo-linking`, scheme already configured for SSO).
- [ ] Role gates: only `OWNER`/`ADMIN` see management actions; the last `OWNER` cannot be removed or demoted (show the server error, do not re-implement the rule).

## 7.1 Findings (2026-10-08, partial — read from `tenant_member` / `tenant_invitation` server source)

- **Accept/decline take the emailed raw `token`, not an `invitationId`.** `AcceptInvitationDTO` / `DeclineInvitationDTO` are `{token: string}`; the token is hashed at rest (`hashToken`), so the server cannot hand it back in a list. Consequence: the Phase 5 `pendingInvitations` list **cannot offer a one-tap accept** unless `GET /auth/me/tenants` returns something acceptable — still to verify (`modules/account/server/me-tenants.route.ts`, ~line 100–130). Until then, accept/decline is driven by the **email deep link** (`…/auth/invitation/accept?token=`) or a paste-the-code field.
- `GET /invitations/accept?token=` is a public preview returning `{invitation, tenant: {tenantId, name}}` (rate limited, no auth) — use it to show who invited the user before asking them to accept.
- `POST /invitations/accept` is authorized with `scope: 'ACCOUNT'` ("a logged-in user with no tenant membership"), but the URL still carries the **inviting** tenant's id. Whether a device bearer token bound to a *different* tenant is accepted on that URL is **not yet verified** (guard code in `auth_abac.guard.next.ts` ~line 85–150 and the device tenant-binding check were not read). This is the main risk and must be settled before coding the accept flow.
- `SendInvitationDTO = {email, memberRole (default 'USER')}`; list is `GET /invitations?page&pageSize&status` returning `{invitations, total, page, pageSize}`; statuses `PENDING | ACCEPTED | DECLINED | EXPIRED | REVOKED`. Sending enforces an invitation quota and seat capacity (plan limits can reject).
- Members: `GET /members?page&pageSize&search&memberRole&memberStatus` → `{members, total, page, pageSize}` (permission `members.view`, floor USER; note the route defaults `page` to **0** when omitted). `UpdateTenantMemberDTO = {memberRole|null, memberStatus|null, roleKeys?}` — both fields are nullable-required, so partial updates must send `null`, not omit. `POST /members` adds a member directly (`members.invite`, floor ADMIN) with seat-limit checks.

## Progress (checkpoint, branch `feat/members-invitations`)

- ✅ Phase 3 had already aligned the member/invitation DTOs and `getMembers/getMember/updateMember/removeMember/getInvitations/sendInvitation/revokeInvitation/acceptInvitation/declineInvitation`; the list shape inside `GET /auth/me/tenants` is already the slim one **without `email` and without a token**, which confirms accept cannot be one-tap from that list.
- ✅ `resendInvitation` and `remindInvitation` added (`POST /invitations/{id}/resend|remind`, no body, answer `{message, invitation}`), with the screen's Remind / Resend / Revoke actions for `PENDING` invitations, haptics and toasts, strings in all six locales, and a service test.
- ✅ `transitionMember` added (`POST /members/{id}/transition`, body `{action: 'suspend'|'reactivate', reason?, until?}`, answer `{message, member}`; OWNER cannot be suspended and only an OWNER may act on an OWNER). The members row menu offers Suspend (with confirmation) / Reactivate; no reason field yet.
- ⬜ Still open: a member detail sheet, accept/decline flow (blocked on the two unread items above), the invitation-decision screen and deep link, last-owner error surfacing, pagination controls on both lists.

## Files touched / created

- Changed: `services/tenant/{tenant.dto,tenant.service.client}.ts`, the two settings screens, `app/(tenant)/select-tenant.tsx`, `locales/*.json`
- New: `app/(tenant)/invitation-decision.tsx` (name to be confirmed against the router groups), tests under `__tests__/`

## Reuse

- Phase 5 `tenantStore` (`pendingInvitations`, `setTenantOverview`), `libs/tenantSwitch.ts`, `tenant-login`.
- Phase 3 MSW pattern; `@/components/ui`: `Card`, `Badge`, `Avatar`, `Select`, `EmptyState`, `Modal`/sheet, `Spinner`.

## Acceptance criteria

- Members list, role change, status transition and removal work against a live tenant; a `USER` sees the list read-only.
- An invitation sent from the app arrives, and accepting it in the app makes the invited user a member of the inviting tenant.
- Declining removes it from `pendingInvitations`.
- Last-owner protection surfaces the server's message instead of a generic error.
- `npm run registry:snapshot` is up to date.

## Risks

- **Accept before login.** A user invited to a tenant has no token pair for it; if the accept route requires a session in that tenant, the flow needs login first. Resolve in 7.1.
- **Role mix-up.** Role pickers must use the server's role keys, not hard-coded `OWNER/ADMIN/USER`, once `access-control/roles` is involved.
- **Scope creep into access control.** Editing roles and the permission matrix stays on web.
