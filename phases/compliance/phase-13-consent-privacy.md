<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/terms_consent/{module.json,server/*} · modules/privacy/{module.json,server/*} · modules/audit_log/{module.json,server/*}
  3. phases/README.md
  4. phases/compliance/README.md (C1–C3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
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

- [ ] `services/compliance/{terms,privacy,audit}.{dto,service.client}.ts` (K6 — new domain folder `compliance/`, update the K6 list in `phases/README.md`).
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
