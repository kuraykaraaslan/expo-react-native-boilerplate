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

---

## Agreements reader, pending flag and session-subject consent — 2026-10-10

Covers 13.2 (read and accept agreements, "something is pending" signal) and the consent-subject change. Not the blocking guard: the server flag is informational by design, so the client shows a non-blocking banner and never gates entry.

**Server contract (READ from the uncommitted working tree of next-boilerplate `modules/terms_consent` and `modules/auth`, not from the summary)**
- `GET /agreements/current` (public, rate-limited, `terms_consent.agreements.read_current`, GUEST). `?type=<AgreementType>` returns a bare `{ agreement, version }` (404 `AGREEMENT_NOT_FOUND`, 409 `NO_PUBLISHED_VERSION`); without `type` it returns `{ data: [{ agreement, version }] }`, `?requiresAcceptance=true` narrows it. Only active reusable agreements with a published, current version; order-specific types (`distance_selling`, `pre_information`) are never listed. `version.content` is the text; `version` is an integer; `contentHash` is returned.
- `POST /agreements/accept` (public, GUEST) body `{ agreementId? | type?, accepted (default true), userId?, anonymousId?, authMethod?, loa?, subjectRefType?, subjectRefId? }`. Answers **201** `{ acceptance }`. The server stamps the version that is CURRENT when the request arrives (not one the client names). A session makes the subject the session user; a body `userId` for someone else is 403; a body `userId` with no session is 401; no session and no `anonymousId` is 400.
- `POST /consent` and `GET /consent` follow the same subject rule (`resolveConsentSubject`): signed in, the subject is the session user; with no session only `anonymousId` is honoured.
- `GET /auth/session` and `POST /auth/device/login` merge `auth:session_extension` contributions at the TOP LEVEL of the body: `compliance: { pendingAgreements: [{ agreementId, type, key, title, versionId, version, contentHash }] }`. It lists required agreements whose current version has no latest `accepted: true` for the user; a newly published version re-opens it. Best-effort: a failing contribution is skipped, and the section is absent when `terms_consent` is not enabled for the tenant. Device login's `compliance` is added only on the final 200 body (computed for the signing-in user and tenant).

**Shipped**
- DTOs (`services/compliance/compliance.dto.ts`): `PendingAgreement`, a lenient `compliance` section (absent, null or malformed reads as nothing pending; a bad entry is dropped; an unknown agreement `type` never fails a sign-in), `Agreement`/`AgreementVersion`/`CurrentAgreement`, accept request and response. `SessionResponseSchema` and `DeviceLoginResponseSchema` gained an optional `compliance`.
- Service: `getCurrentAgreements`, `getCurrentAgreement(type)`, `acceptAgreement`.
- Consent: `getConsentState()` takes no argument and sends no `userId`; `recordConsent` no longer has `userId` in its schema (a stray one is stripped). The client never sends `anonymousId`: the app has no guest screens and no anonymous identifier, so there is no guest behaviour to keep.
- `stores/complianceStore.ts` (in memory, not persisted; tagged with the organization it was read for) and `libs/pendingAgreements.ts` (`applyCompliance`, `refreshPendingAgreements`, `clearPendingAgreements`, `usePendingAgreements`). Fed by device login (`startDeviceSession`), session restore, the 2FA completion read, a tenant switch, the home screen load and the legal screen load. Cleared on logout and on a session death. A refresh drops its answer after an organization switch, a sign-out or a newer refresh (same stance as `libs/realtime.ts`); the hook ignores a flag read for another organization.
- `components/compliance/PendingAgreementsBanner.tsx` (warning `AlertBanner` with "Review"): on the home screen and the legal screen. One pending document opens the reader, several open the legal screen.
- Legal screen: an "Agreements" card listing current agreements with version and status (needs acceptance / accepted).
- Reader `app/(drawer)/settings/agreement.tsx` (`?type=`): shows the text as selectable plain `Text` (markup is displayed, never interpreted; no WebView), and an accept button only when that agreement is pending. Success haptic and toast, then back.
- `AGREEMENTS.*` strings in all six locales. Tests: `__tests__/pendingAgreements.test.tsx` (flag, guards, banner, reader), additions to `compliance.service.test.ts` and `auth.service.test.ts`.

**Deviations**
- No blocking guard (13.2's original "blocking acceptance"): the server defines the flag as informational. The banner is the only prompt.
- The reader opens by `type`, not by id: `/agreements/current` has no by-id form. Two active agreements of the same type are not distinguishable by this route (the server's `getByType` picks one); the legal list opens each by type.
- Accept sends `agreementId` (precise), and the reader compares the acceptance's `versionId` with the version it displayed; if the server stamped a different one, the text is reloaded and the user is told, and the pending flag is NOT cleared.
- Acceptance history and "withdraw" (`accepted: false`) are not offered.

**Not verified:** nothing ran against a live server or device; shapes come from reading source. The device login `compliance` key was read from the route diff, not observed.

**Owner still must supply:** nothing for this item (no new env keys or identifiers).

---

## Adversarial review of the agreements work — 2026-10-10

Every route, body and response of the section above was re-read against the uncommitted source of next-boilerplate (`agreements-current.route.ts`, `terms_consent.agreements.current.ts`, `agreements-accept.route.ts`, `terms_consent.subject.ts`, `terms_consent.session-extension.ts`, `consent.route.ts`, the DTO and type files, and the auth session and device-login route diffs). No contract mismatch was found: shapes, status codes (201 on accept, 404/409 on `?type=`, 403/401 subject rules) and the top-level `compliance` key all match.

**Fixed**
- A background `refreshPendingAgreements` that started before a fresher `applyCompliance` (tenant switch, device login, 2FA read) could overwrite the fresher flag with an older answer. `applyCompliance` now bumps the refresh sequence.
- The reader kept running after a sign-out that happened while an acceptance was in flight (toast, navigation); it now stops when the session is gone.
- The legal screen's consent save could write `saved` state after an organization switch; it now drops the result like the load does.
- Test: superseded refresh in `__tests__/pendingAgreements.test.tsx`.

**Checked, no change needed:** only `expo-haptics` and `expo-router` are imported (already used on web-safe paths elsewhere); no tokens in the store or logs (errors are logged by status code only); all six locales carry the same 16 `AGREEMENTS.*` keys; hooks are unconditional.

**Not verified:** still no live server or device run; the legal screen has no render test.

---

## Delete account and export my data (13.3 / C1) — 2026-10-10

Closes the release-blocking 13.3 gap: a signed-in user can delete their own account and export their data from inside the app. Settings, Privacy & legal, "Your data" (`app/(drawer)/settings/account-data.tsx`).

**Server contract (READ from the uncommitted working tree of next-boilerplate: `modules/privacy/server/{me-deletion-request.route,me-data-export-request.route,privacy.self-service.service,privacy.dto,privacy.messages}.ts`, `modules/common/server/route-error.ts`, `modules/user_security/server/user_security.types.ts`; not from the summary)**
- `POST /auth/me/deletion-request` body `{ password? }`, ACCOUNT scope (the URL tenant only routes), permission `privacy.account.delete` (USER), rate limit `auth`. Deletes NOW. 200 `{ status: 'COMPLETED' | 'PARTIAL', tenants: [{ tenantId, privacyRequestId?, status: 'COMPLETED' | 'PARTIAL' | 'FAILED', erased, retained, error? }], tenantsScheduledForDeletion: string[] }`. Top-level status is PARTIAL if any workspace is not COMPLETED, including FAILED ones. Every session of the user is revoked.
- Errors (envelope `{ message, code, details? }`): 400 `Enter your password to confirm` (VALIDATION_ERROR) when a password was needed and none sent; 401 `That password is not correct`; 409 platform admin or a root-tenant member (`A platform administrator cannot delete their own account here; …`, no details); 409 sole OWNER of a workspace that still has other active members, `details.tenants: [{ tenantId, name? }]`; 409 `A workspace that only you belong to cannot be scheduled for deletion right now` with `details.reason` (nothing was changed).
- Re-auth rule (`assertReauthenticated`): a password is required when `passwordChangedAt` is stamped OR the account has no linked social account; otherwise a live session is the proof and a password sent is ignored. A password account that linked Google is still asked.
- `POST /auth/me/data-export-request` body `{ password? }` (same re-auth), TENANT scope, permission `privacy.account.export`. 200 `{ privacyRequestId, account, url?, expiresIn? | dossier? }`: `url` is a presigned link to the stored JSON dossier; `dossier` (`{ subject, generatedAt, sections, errors, totalRows }`) comes back inline when storage fails. `account` is always present: `{ user, profile, preferences, socialAccounts, memberships }`.

**Shipped**
- DTOs and service: `services/compliance/compliance.dto.ts` (`AccountDeletionResponseSchema`, `DeletionConflictDetailsSchema`, `DataExportResponseSchema`, `SelfServiceReauthRequestSchema`), `ComplianceClientService.{requestAccountDeletion, requestDataExport(tenantId), deletionConflictTenants}`.
- "Does this account have a password?" (`libs/reauth.ts`, `accountHasOwnPassword`): the client mirrors the server rule from two reads it already has, `GET /auth/me/security` (`passwordChangedAt`) and `GET /auth/me/social-accounts` (count). `false` hides the password field and sends `{}`; `true` asks; if either read fails (`null`) the field is shown and the server decides. Both directions are covered by the fallback: a 400 `Enter your password to confirm` reveals the field, a 401 shows "That password is not correct" inline (the transport leaves this 401 alone, the session survives). `reauthFailure()` classifies those two by status and server message.
- `components/compliance/DeleteAccountModal.tsx`: consequences, password (conditional), typed confirmation (`DELETE`, case-insensitive, same in every language so any keyboard can type it), danger button armed only when both are satisfied. Haptics: warning on submit, success or error after. A 409 with `details.tenants` shows those workspaces and what to do (transfer ownership or remove the other members), with "Nothing was deleted."; any other 409 shows a generic "cannot be deleted from the app" note; other errors go through `handleApiError`.
- `libs/accountDeletion.ts` `finishAccountDeletion(result)`: NO server logout (every call would 401); closes the socket and message cache (`resetRealtime`), then `clearLocalSession()` (extracted from `logout()` so both share one wipe: every tenant's tokens, outbox, auth user, pending agreements, flags, app lock, tenant store), then the bell count, the SSO pending state and cached brand colors, then `router.replace('/login')` and a success toast (a longer one that says records are kept for PARTIAL). Applied unconditionally once the server said 200, whatever organization is active by then. Device language and theme are kept (not account data).
- `components/compliance/ExportDataModal.tsx`: exports for the ACTIVE organization (the request is pinned to the tenant id read at submit). A `url` opens in the in-app browser (http(s) only, `safeWebUrl`); the "Share account details" button sends `{ account, dossier? }` through the system share sheet. Late answers (organization switched, signed out, modal gone) are dropped, never opened or shown.
- Strings: `ACCOUNT_DATA.*` (39 keys) in all six locales. Hub: tile on the Privacy & legal screen.
- Tests: `__tests__/accountData.test.tsx` (24, MSW): both routes' bodies and shapes, COMPLETED and PARTIAL, 400/401/409 handling, last-owner list, the typed-word and password gating, the full local wipe across two tenants with zero server logout calls, export link and inline paths, unsafe link, and late-answer guards.

**Differences between the server summary and the source**
- Data export ALSO requires re-authentication (`{ password? }`, 400/401 as for deletion). The summary only described `{ privacyRequestId, account, url|dossier }`.
- `expiresIn` accompanies `url`. Per-workspace `status` can also be `FAILED`, and the 409 for a platform admin also covers a member of the root tenant. A second 409 exists (`TENANT_DELETION_REFUSED`, `details.reason`).
- The route is not transactional after its preflight: a failure inside the per-account steps is logged server-side and skipped, but `UserService.erase` or the session revocation can still throw (500) after earlier steps ran. The client treats any non-200 as "not deleted" and keeps the session.

**Deviations**
- No `expo-sharing` / `expo-file-system` dependency was added. The system share sheet is React Native's own `Share` (no native rebuild, no lockfile change). Consequence: only text can be shared (a JSON string, not a `.json` file), and a very large inline dossier may exceed what Android's share intent carries. The normal path is the stored `url`, so inline dossiers only appear when the server's storage is down. If a file share is wanted: `npx expo install expo-file-system expo-sharing` and write `dossier-<id>.json` to the cache directory.
- The account record is shared separately from the stored dossier link (the link holds only the per-workspace dossier; `account` only arrives in the response).
- Push tokens are not unregistered on deletion: Phase 8 (Expo push registration) is not coded in this app, so there is nothing registered to remove (and the sessions are already revoked). When it ships, deletion needs no `DELETE /notifications/push/tokens` (it would 401), but ordinary logout does, before the server logout.
- Requests in flight during the deletion (unread polling) may hit 401 once the server has revoked the sessions and show the "session ended" toast before the response lands.

**Not verified:** nothing ran against a live server or device; the contract was read from source and the tests run against MSW built from it. No screen render test for `account-data.tsx` (the modals are rendered, the screen is covered by typecheck). `accountHasOwnPassword` uses `GET /auth/me/social-accounts` (`listConnectedAccounts`) as a stand-in for the server's `getByUserId`; if the two differ for some provider, the server's 400 fallback covers it. The presigned URL was not seen (relative or absolute); a relative one is resolved against `EXPO_PUBLIC_API_URL`.

**Owner still must supply:** nothing for this item (no new env keys or identifiers).

## 2026-10-10 adversarial review of "delete account and export my data"

Routes, bodies and responses were re-read from the uncommitted `next-boilerplate/modules/privacy/server/{me-deletion-request.route,me-data-export-request.route,privacy.self-service.service,privacy.dto,privacy.messages}.ts` and `account/server/me-{security,social-accounts}.route.ts`. No contract mismatch was found: bodies are `{password?}` (min 1, max 256), responses and the 409 `details: { tenants: [{ tenantId, name? }] }` match the DTOs, the two password refusals match `PRIVACY_MESSAGES` (400 / 401 strings), and `accountHasOwnPassword` mirrors `assertReauthenticated`.

Fixed:
- A haptic failure after the server had already deleted the account fell into the error path and left the device signed in to a deleted account. The wipe now runs first and every haptic goes through `libs/safeHaptics.ts` (also used by the export modal).
- Deletion and export used the 10 s transport timeout while the server erases / builds the dossier per workspace; a client timeout on a completed deletion would look like a failure. Both calls now use a 120 s timeout.
- The export modal kept showing personal data after an organization switch or sign-out while the answer was on screen, and a late error after a sign-out still toasted. It now closes itself on either change and drops late errors.
- Tests added for the timeouts, the failing haptic engine, and the close-on-switch behaviour.

Server differences observed (source over summary):
- `account` in the export answer is `{ user, profile, preferences, socialAccounts, memberships }`; `expiresIn` is present only with `url`.
- The platform-admin and tenant-deletion-refused 409s carry no `details.tenants` (the latter carries `details.reason`), so only the last-owner 409 produces the workspace list.
- `listConnectedAccounts` (what the app reads) can include SAML / government identities that the server's own re-auth check (`getByUserId`) does not, so the app may skip the password prompt where the server wants one; the server's 400 PASSWORD_REQUIRED then reveals the field (covered by a test).

Not verified: live server run; a request that times out after 120 s leaves the outcome unknown (the next authenticated call 401s and the guards sign out). Other in-flight requests may toast "session ended" in the instant between the server deleting sessions and the local wipe. Owner still supplies nothing for this task.
