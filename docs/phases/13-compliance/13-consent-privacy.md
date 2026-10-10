<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/terms_consent/{module.json,server/*} · modules/privacy/{module.json,server/*} · modules/audit_log/{module.json,server/*}
  3. docs/phases/README.md
  4. docs/phases/13-compliance/README.md (C1–C3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: docs/phases/README.md §Order
-->

# Phase 13 — Agreements, privacy requests and audit viewer

**Goal:** A user can read and accept the current agreements, manage consent choices, request access to or erasure of their data (including deleting their account), and an admin can read the tenant audit log.

Modules: `terms_consent`, `privacy`, `audit_log`. Priority 2.

## 13.1 Contract check

- [ ] `terms_consent`: how a client lists the agreements a user must accept (`GET /agreements`, `/agreements/acceptances`, `/consent/config`), the accept body (`POST /agreements/accept`), and whether registration/login returns a "pending acceptance" flag.
- [ ] `privacy`: who may call `POST /privacy/requests` (a data subject for themselves? with a device token?), the verification step (`…/verify`) and what an erasure does to sessions and tokens.
- [ ] `audit_log`: list filters, pagination and the permission needed; confirm a device token can read it.
- [ ] Record each answer (and each gap) at the bottom of this file the way Phase 3 recorded server corrections.

## 13.2 Agreements and consent

- [ ] `services/compliance/{terms,privacy,audit}.{dto,service.client}.ts` (K6 — new domain folder `compliance/`, update the K6 list in `docs/phases/README.md`).
- [ ] Screen "Legal" (settings): list current agreements with version and date; open the document in a scrollable reader (plain text/markdown rendering; no WebView unless the content is HTML — then sanitize).
- [ ] Blocking acceptance: when the server reports a required agreement is not accepted, show it before the drawer opens (guard sits next to the OTP / forced-password guards). Accept stamps the version/hash it displayed.
- [ ] Consent toggles from `consent/config` + `consent/records` (marketing, analytics) with save and history.

## 13.3 Privacy requests and account deletion

- [ ] "Your data" screen: create an access (dossier) request, list own requests with status, download the dossier through the system share sheet when ready.
- [ ] "Delete account": explain consequences, require re-authentication (password or OTP as the server asks), create an erasure request, show status. On completion/confirmation, sign out and clear **all** tenants' tokens (`flush()`), push registrations and MMKV state.
- [ ] If the server lets the data subject create requests only through the web (C1 gap), record it, surface a clear "continue on the web" link as the interim and keep this task open.

## 13.4 Audit viewer (admin)

- [ ] `app/(drawer)/settings/tenant/audit-log.tsx`: paginated list, filter by actor/action/date, detail sheet. `OWNER`/`ADMIN` only (C3).

## Files touched / created

- New: `services/compliance/*`, `app/(drawer)/settings/{legal,privacy}.tsx`, `app/(drawer)/settings/tenant/audit-log.tsx`, `libs/useRequiredAgreements.ts`
- Changed: `app/(drawer)/_layout.tsx` (guard), `app/(auth)/register.tsx` (acceptance), `stores/*` (flush on deletion), `locales/*.json`
- Test: pending-acceptance guard, accept stamps version, deletion clears every tenant's tokens

## Reuse

- Phase 4 guards and session flags; Phase 5 `flush()`; `@/components/ui` `Card`, `Checkbox`, `Modal`, `Badge`, `EmptyState`.

## Acceptance criteria

- A new agreement version blocks the next app entry until accepted, and the acceptance is recorded server-side with that version.
- A user can request and track a data export; the file is delivered through the OS share sheet.
- Deleting the account from inside the app signs the user out of every tenant and the credentials no longer work.
- An admin can read the audit log; a `USER` cannot reach it.
- `npm run registry:snapshot` is up to date.

## Risks

- **Store rejection** if account deletion is only reachable on the web — treat a gap in C1 as release-blocking for store submission.
- **Irreversible action.** Erasure needs an explicit second confirmation and re-authentication; test the cancel path.
- **Legal text rendering.** Never truncate or restyle in a way that hides the clause the hash covers.
- **Audit data volume.** Always paginate; never prefetch the whole log.

---

## 🟡 CODED (partial) — 2026-10-09 · **account deletion is blocked on the server (C1)**

On `main`. Typecheck 0 errors, jest 169/169 (5 new), web export OK. Screenshots: `.junk/screenshots/phase-13-consent-privacy/` (6 images).

**Corrections to this plan (13.1 contract check — read from `terms_consent`, `privacy`, `audit_log` server source)**
- **`privacy` is a DPO/admin workflow, not self-service.** `POST /privacy/requests` needs `privacy.requests.create` (**ADMIN**), takes a `subjectType`/`subjectId` of the data subject, and an erasure then goes verify → dossier (**OWNER**) → `erasure` with a preview `confirmToken` (**OWNER**). There is **no route anywhere in `account` or `auth` that lets a signed-in user delete their own account or file their own request.** So 13.3's "Delete account" cannot be built without a server change, and the "continue on the web" interim does not exist either (the web would need the same admin role).
- **No user-facing way to read agreement text.** `GET /agreements` and `/agreements/{id}` are ADMIN (`terms_consent.agreements.read`); the public/GUEST routes are only `POST /agreements/accept`, `/consent` (GET state / POST record) and `GET /consent/config`. The login/registration answers carry **no "pending acceptance" flag** either, so the blocking-acceptance guard (13.2) has nothing to key on.
- **Consent routes identify the subject by a `userId` in the request, not by the session** (they are GUEST routes). The client sends the signed-in user's own id; the server does not check it against the token — worth a server-side look, not something the app can fix.
- `audit_log`: `GET /audit-logs` is ADMIN (`audit_log.logs.read`), **1-based** pages, filters `severity/action/actorId/resourceType/fromDate/toDate`, and the route is plan-gated (`assertAuditLogEntitled` — a 403 on plans without it, surfaced by the generic error handler).

**What shipped**
- `services/compliance/{compliance.dto,compliance.service.client}.ts`: consent config / state / record and the audit list, with tests of the real shapes.
- **Privacy & legal** (`app/(drawer)/settings/legal.tsx` + hub tile): Privacy policy and Terms of service links taken from the tenant's **public branding** (`privacyPolicyUrl`, `termsOfServiceUrl`) and opened in the in-app browser — only http(s) is ever opened (`safeWebUrl`); and **Privacy choices** from `consent/config` (required purposes are always-on and disabled, optional ones default to off until answered) saved as one batch tagged with the policy version. The two reads are independent: a tenant without consent configured still shows its policy links and vice versa.
- **Audit log** (`app/(drawer)/settings/tenant/audit-log.tsx` + tile on the organization page): admin-only (others get a note and no request), severity filter, 20 per page with Load more, stale answers dropped.
- Strings in all six locales.

**Not done / blocked**
- ⛔ **Account deletion (13.3) — release-blocking for store submission** (Apple 5.1.1(v), Google Play data-deletion policy). Needs a server route a signed-in user can call for themselves, e.g. `POST /auth/me/deletion-request` (re-auth required, then the `privacy` erasure pipeline) or `DELETE /auth/me`. Once it exists the client part is small: re-authenticate, call it, then `flush()` all tenants' tokens and Phase 8's `unregisterPush`.
- Data-export request (13.3) — same reason.
- Blocking acceptance of a new agreement version (13.2) — needs a server-side signal and a member-readable agreement route.

**Deliberate deviations:** no agreement reader (no route to read from — the policy links open the web pages instead); audit log has no free-text/date filters or detail sheet (severity filter only); consent history is not shown.

**Not verified:** nothing ran against a live server; the web build was driven against a mock built from the server's shapes.

---

## Audit log filters and detail sheet — 2026-10-10

Closes the 13.4 leftover (the earlier "severity filter only" deviation).

**Contract (re-read from `modules/audit_log/server/{audit-logs.route,audit_log.dto,audit_log.query}.ts`):** the route takes `page` (1-based), `pageSize`, `actorId`, `action` (case-insensitive substring), `severity`, `resourceType` (exact match), `resourceId`, `fromDate`, `toDate` (inclusive bounds on `createdAt`; a bare date is read as UTC midnight).

**Shipped**
- `app/(drawer)/settings/tenant/audit-log.tsx`: action text filter and resource type filter (debounced 400 ms), From / To day fields, a "Clear filters" button, and tap-to-open rows.
- `components/tenant/AuditLogDetailSheet.tsx`: a modal with time, actor kind and id, resource type and id, IP address, entry id and pretty-printed metadata.
- `utils/auditFilters.ts`: strict `YYYY-MM-DD` validation; From is sent as the start of the UTC day and To as its end so the chosen day is included.
- `ComplianceClientService.getAuditLogs` also accepts `actorId`, `resourceType`, `fromDate`, `toDate`.
- 21 new `AUDIT.*` strings in all six locales.
- Guards: answers (first page and Load more) are dropped on a filter change or an organization switch (request sequence plus `getActiveTenantId()`); the detail sheet closes on a switch. An invalid or inverted date shows an inline error and is not sent, so the list always matches the filters it shows.
- Tests: `__tests__/auditFilters.test.ts`, plus a filter query-param test in `__tests__/compliance.service.test.ts`. Typecheck clean, jest 254/254.

**Deviations**
- Dates are typed as `YYYY-MM-DD` text: no date picker is re-exported through `@/components/ui` yet. Days are UTC, not device-local.
- No `actorId` filter field in the UI (the service supports it); the actor is visible in the detail sheet.

**Not verified:** not run against a live server or on a device; no component render tests (the repo has no render-test setup), so the screen and sheet were checked by typecheck and the service and util tests only.

---

## Audit filters review fixes — 2026-10-10

Server contract re-checked against `modules/audit_log/server/{audit-logs.route,audit_log.query,audit_log.dto}.ts`: params and inclusive date bounds are correct.

**Fixed**
- The `action` filter is an `ILIKE %…%` match on the server, so `_` and `%` typed by the user acted as wildcards (`tenant_domain` matched `tenantXdomain`). The text is now escaped with `escapeLike` before sending.
- A superseded load's `finally` hid the spinner of the load still running (rapid filter changes flashed the empty state). The spinner is now cleared only by the latest load.
- The six locale files lost their trailing newline in the previous commit; restored.
- Test: `escapeLike` in `__tests__/auditFilters.test.ts`.

**Not fixed / not verified:** audit metadata is shown as returned by the server (admin-only route, no client-side redaction); still no component render tests.
