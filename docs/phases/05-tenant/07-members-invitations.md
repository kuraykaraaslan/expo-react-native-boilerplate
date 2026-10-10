<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/tenant_member/{module.json,server/*.dto.ts} · modules/tenant_invitation/{module.json,server/*.dto.ts}
  3. docs/phases/README.md (§Locked decisions K1–K2)
  4. docs/phases/05-tenant/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: docs/phases/README.md §Order
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
- ✅ Paging: members use server paging (`page` 0-based, 20 per page, infinite scroll) and **server-side search** (debounced `search` param, stale answers dropped); invitations load 20 per page (`page` 1-based) with a "Load more" button. Before this the lists silently stopped at the server's default of 10.
- ⬜ Still open: accept/decline flow (blocked on the two unread items above), the invitation-decision screen and deep link.

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

---

## ✅ CODED (partial) — 2026-10-08

Branches `feat/members-invitations` + `feat/members-pagination`. Typecheck 0 errors, jest 130/130 (3 new), web export OK. The pre-existing members and invitations screens now talk to the real routes end to end except the accept/decline flow.

**What shipped**
- Invitations: Send reminder / Resend / Revoke on `PENDING` rows (`POST /invitations/{id}/remind|resend`, no body, answer `{message, invitation}`), haptics and toasts.
- Members: Suspend (with confirmation) / Reactivate via `POST /members/{id}/transition` `{action}`; last-owner and owner-only rules are the server's, shown as its error messages.
- Paging and server-side member search on both lists (see Progress).
- Strings in all six locales.
- Screenshots of every state: `.junk/screenshots/phase-7-members-invitations/` (local, not committed; made from the web build against a mock API built from the test fixtures).

**Deliberate deviations**
- (Resolved 2026-10-10, see the last section) Suspend now takes `reason` / `until`.
- (Resolved 2026-10-10) The member detail sheet and `GET /members/{id}/activity` are now used.

**Not done / blocked**
- **Accept / decline an invitation in the app.** The server takes the emailed raw `token` (hashed at rest), and `GET /auth/me/tenants` returns invitations without it, so there is no one-tap accept from the Phase 5 list. Two things were not verified because the server source reads were denied in this session: what `me-tenants.route.ts` returns for invitations beyond the slim shape, and whether `POST /invitations/accept` (scope `ACCOUNT`) accepts a device token bound to a *different* tenant. Build the deep-link / paste-the-code screen only after those are confirmed.
- Nothing was run against a live server.

**Update 2026-10-09 (server source read):** `GET /auth/me/tenants` returns `invitations` as `{invitationId, tenantId, memberRole, status, expiresAt, createdAt, tenant}` — **no token**. `POST /invitations/accept` and `/decline` both take `{token}` (the emailed raw token) and authorize with scope `ACCOUNT`; `GET /invitations/accept?token=` is a public preview. So a one-tap accept from the Phase 5 list is impossible; the open question that remains is whether the `ACCOUNT`-scope guard accepts a device token bound to another tenant when the URL addresses the invited tenant (not provable from source alone). Build the paste-the-code / deep-link screen only after testing that against a live server.


---

## ✅ Leftovers coded — 2026-10-10 (Suspend reason/until, member detail sheet)

Typecheck 0 errors, jest 249/249 (6 new).

**What shipped**
- **Suspend form** (`components/tenant/SuspendMemberModal.tsx`) replaces the plain confirmation: optional reason (max 500) and optional end date typed as `YYYY-MM-DD` (`utils/suspendUntil.ts` validates it: real calendar day, today or later, ends at 23:59:59 local, sent as ISO `until`). The form stays open with the typed values when the server refuses (for example OWNER rules).
- **Member detail sheet** (`components/tenant/MemberDetailSheet.tsx`): profile, role/status badges, suspension reason and end date, and the member's activity timeline from `GET /members/{id}/activity` (`{logs, total}`, `page` 1-based, 10 per page, Load more). Activity is requested only for OWNER/ADMIN (`members.view_activity`); other roles see the profile only. Opened by tapping a row or the new "View details" menu item.
- `TenantClientService.getMemberActivity`; rows reuse the existing `AuditLogsResponseSchema` (the route returns the tenant audit-log rows filtered to the member's user).
- Organization-switch guards: transition answers and activity pages are dropped when the active organization changed or the sheet moved to another member (sequence counter + `getActiveTenantId`).
- Strings in all six locales (`MEMBERS.*`, `COMMON.CLOSE`, `COMMON.RETRY`).

**Deviations**
- The end date is a validated text field, not a calendar picker: no date-picker dependency exists in the app and adding one needs a dev build. Swap in a picker later; `parseSuspendUntil` stays the validation.
- The existing Edit modal still offers `SUSPENDED` in its status select (plain `PUT`, no reason); it was left unchanged.

**Not verified**
- Nothing was run against a live server or on a device; no screenshots were taken. Component behaviour (sheet, form) has no automated tests because the repo has no component-test setup; the service and validation parts are covered.

## 2026-10-10 - Review fixes for suspend reason / member detail sheet

- Fixed: dialogs (edit, remove, suspend, detail sheet) stay open with the previous organization's member after an organization switch; they now close when the active tenant changes.
- Fixed: the suspension reason (an admin-written note) was shown to non-admin viewers of the detail sheet; it is now shown to ADMIN/OWNER only. The until date stays visible.
- Tests: transition request rejects a >500 char reason and a non-ISO `until` before sending.
- Verified against next-boilerplate `members-member-id-activity.route.ts` and `members-member-id-transition.route.ts` (`reason`, `until`, 1-based `page`, `{logs,total}`).
- Not verified: on-device rendering of the sheet; there are no component render tests in this repo. Activity rows are the member's own actions (actorId), not actions done to the member.

---

## ✅ Accept / decline by invitation id coded — 2026-10-10

**What shipped**
- `TenantClientService.acceptInvitationById(invitationTenantId, invitationId, authTenantId?)` and `declineInvitationById(...)` (`POST /invitations/{id}/accept|decline`, no body). The URL is built with `tenantPath(invitingTenant, …)` and the request is given `tenantId: <current tenant>` so the bearer is the token pair this device already holds. New axios request option `foreignTenant` (set when the two differ): a "tenant unavailable" refusal that is about the INVITED tenant no longer ends the session of the CURRENT tenant.
- `libs/invitations.ts`: `answerInvitation` (answer, then re-read `GET /auth/me/tenants` into `tenantStore`, dropping the result when the organization or sign-in changed meanwhile), `refreshTenantOverview`, `invitationErrorKey` (403 / 404 / 409 / 410 → locale keys), `invitationIsGone`.
- `components/tenant/PendingInvitations.tsx`: list with Accept / Decline per invitation (role badge, expiry), decline behind `ConfirmDialog`, haptics (success / warning / error), `sonner-native` toasts. After accept the row becomes a "You joined X" card with a **Sign in to X** button that opens `tenant-login` (K2: one token pair per tenant). It replaces the info banner on `select-tenant` and is mounted on the organization screen (`settings/tenant/index`, refreshing the overview on mount).
- `MY_INVITATIONS.*` strings in all six locales; the now unused `AUTH_UI.PENDING_INVITES_*` keys were removed.
- Tests: `__tests__/invitations.test.ts` (addressing + bearer, foreign-tenant refusal keeps the session, refresh, stale guards, error mapping), `__tests__/pendingInvitations.test.tsx` (accept → sign-in path, confirm / cancel decline, 403, 404 refresh, organization switch).

**Server contract as READ from source** (next-boilerplate working tree, uncommitted: `invitations-invitation-id-accept.route.ts`, `…-decline.route.ts`, `tenant_invitation.lifecycle.service.ts`)
- `POST /tenant/{invitingTenantId}/api/invitations/{invitationId}/accept` → 200 `{message, tenantId, memberRole}`; `/decline` → 200 `{message}`. Permissions `tenant_invitation.invitations.accept|decline`, `scope: "ACCOUNT"`. `authorizeAccount` authenticates the user session only and never compares the URL tenant with the token's, so a device token for another tenant is accepted (read in `auth_abac.guard.scopes.next.ts`; not proven on a live server).
- 403 `INVITATION_EMAIL_NOT_VERIFIED` when `emailVerifiedAt` is empty (checked BEFORE the lookup). 404 "Invitation not found" for an unknown id OR an invitation addressed to another email. Not mentioned in the summary: 409 already accepted / declined, 410 revoked / expired (`assertUsable`), and accept can also fail on already-member / seat limits inside `acceptInvitation`.
- `GET /auth/me/tenants` `invitations[]` is `{invitationId, tenantId, memberRole, status, expiresAt, createdAt, tenant}` with only PENDING, unexpired rows for the caller's email (`tenant` may be `null` if the tenant row is gone).

**Deviations**
- Any 403 on these routes is shown as "verify your email": the route's own guard raises no other 403 for a signed-in user, but a policy denial would be mislabelled. The email-verified flag is not read client side beforehand because the server is the authority.
- The older token-based `acceptInvitation` / `declineInvitation` service methods stay (for the future email deep link); the deep-link / paste-the-code screen is still not built.
- After accepting, the app does not switch organization by itself; the user taps "Sign in to X" (a password is needed for a tenant with no stored pair).

**Not verified**
- Nothing ran against a live server or on a device; the server changes are uncommitted in next-boilerplate, so behaviour depends on them being deployed.
- The proxy's own answer for an invited tenant that is inactive or missing (hence the `foreignTenant` guard) was not read.

**Owner still must supply**: nothing for this item (no identifiers involved); server deploy of the two routes.
