<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/api_key/{module.json,server/*} · modules/tenant_domain/{module.json,server/*} · modules/tenant_session
  3. docs/phases/README.md (§Locked decisions K2)
  4. docs/phases/14-platform/README.md (P1, P2)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: docs/phases/README.md §Order
-->

# Phase 18 — Tenant admin: API keys and domains

**Goal:** An `OWNER`/`ADMIN` can inspect and revoke API keys and check custom-domain health from the app. Lowest priority of the set; do it last and only if a product needs mobile administration.

Modules: `api_key`, `tenant_domain`, `tenant_session`. Priority 2.

## 18.1 `tenant_session` — no client work

`tenant_session` has no routes; it binds a user session to a tenant and resolves the tenant from the request on the server. The client's equivalent is already Phase 2 (`/api/tenant/{id}/` prefix) and Phase 5 (K2). Record "covered by Phases 2 and 5" and close this item.

## 18.2 API keys

- [ ] Contract: `GET/POST /api-keys`, `GET/DELETE /api-keys/[apiKeyId]`, `POST …/rotate`, `POST /api-keys/revoke-all`, `GET /api-keys/activity-report`, `GET /api-keys/rotation-audit`, scope definitions at `/api-keys/scope-definitions`. Read the DTOs for what is returned on create/rotate (a plaintext key shown **once**).
- [ ] Screens: list with prefix, scopes, last used, expiry; create (name, scopes from definitions, expiry); rotate and revoke with confirmation; "revoke all" behind a second confirmation.
- [ ] The plaintext key is shown once with copy/share, then cleared from memory; never written to MMKV, logs or the clipboard history automatically.

## 18.3 Domains

- [ ] Contract: `GET/POST /domains`, `GET/DELETE /domains/[domainId]`, `POST …/verify`, `POST …/ssl-check`, `GET …/timeline`, `GET /domains/report`.
- [ ] Screens: list with verification and SSL status, DNS record instructions (copyable TXT/CNAME values), "verify now" and "check SSL" actions, timeline. Adding a domain is allowed; DNS changes happen at the user's registrar, so the screen explains the next step.
- [ ] Cron routes (`/cron/*`) are server-side; ignore.

## Files touched / created

- New: `services/platform/{apiKey,domain}.*`, `app/(drawer)/settings/tenant/{api-keys,domains}.tsx`
- Changed: tenant settings navigation, `locales/*.json`
- Test: one-time key display clears state, role gating, revoke-all confirmation

## Reuse

- Phase 5 role handling; Phase 12 tenant settings navigation; `@/components/ui` `Card`, `Badge`, `Modal`, `Alert`.

## Acceptance criteria

- A created key is visible once and works against the API; rotated/revoked keys stop working.
- Domain verification status updates after a DNS change and "verify now".
- A `USER` cannot reach either screen.
- `npm run registry:snapshot` is up to date.

## Risks

- **Secret handling.** Keys must not leak through logs, screenshots (consider blocking screenshots on that screen), or persisted state.
- **Destructive bulk action.** `revoke-all` can lock out integrations; require explicit confirmation and show the count.
- **Scope creep** into full domain management; keep to inspect/verify/add.

---

## 🟡 CODED — 2026-10-09

**Contract check (server source):**
- API keys: `GET /api-keys?page&pageSize` → `{keys, total}`; `POST /api-keys` (`name`, `scopes[]`, optional `description`, `environment`, `ipAllowlist`, `expiresAt`) → 201 `{key, rawKey}`; `POST /api-keys/{id}/rotate` (`graceSeconds`, default 24 h) → 201 `{key, rawKey}`; `DELETE /api-keys/{id}`; `POST /api-keys/revoke-all` → `{message, revokedCount}`; `GET /api-keys/scope-definitions` → `{data, total}`. Permissions `api_key.keys.*` (ADMIN+, `TENANT` scope). `keyHash` is never sent; dates are ISO strings.
- Domains: answers are wrapped `{success, …}`: list `{domains, total}`, detail `{domain, verification | null}` (the DNS record `{method, recordName, recordValue}` comes from `verification`, the token is not on the domain), verify `{isVerified, message}` (a failed lookup is a 200), `ssl-check` `{ssl}`. Permissions `tenant_domain.domains.*`.
- `tenant_session` has no routes: covered by Phases 2 and 5 (18.1 closed).

**Built:** `services/platform/{apiKey,domain}.{dto,service.client}.ts`, `app/(drawer)/settings/tenant/{api-keys,domains}.tsx`, `components/admin/{CreateApiKeyModal,IssuedKeyModal,DomainDetailModal}.tsx`, tiles on the organization screen (OWNER/ADMIN only; the screens also show a no-access note to a `USER` who opens the route directly), strings in all six languages. The plaintext key lives only in the screen's state: the issued-key modal has no backdrop dismiss, copying is an explicit tap, and leaving the screen clears it. Tests: `__tests__/tenantAdmin.service.test.ts`.

**Deliberate deviations:**
- Domain detail is a modal over the list, not a separate route.
- Not built: domain timeline (`GET …/timeline`), `GET /domains/report`, `GET /api-keys/activity-report` and `rotation-audit`, IP allowlist and environment (`test`) on key creation, key detail/lineage view, editing a key.
- "Revoke all" is gated by a separate emergency card plus a confirmation dialog that states the number of active keys (two deliberate steps), not a typed phrase.
- Screenshot blocking on the key screen was not added (needs a native module); the key is also never logged.
- Not run against a live server; no component render tests (the repo has no render-test setup).


---

## 🟡 CODED — 2026-10-10: reports and domain timeline

**Contract check (server source, `modules/{api_key,tenant_domain}/server`):**
- `GET /domains/{id}/timeline?page&pageSize` (page 1-based, default 50 server-side; the client asks for 20) → `{success, logs, total}`, audit-log rows with `resourceType = tenant_domain`, newest first. Permission `tenant_domain.domains.view_timeline`.
- `GET /domains/report` → `{success, report}` with `generatedAt`, `sslExpiryWarningDays`, `snapshot` (counts and status breakdowns), `sslExpiry[]` (`daysUntilExpiry`, `atRisk`) and `dnsAge[]` (`daysSinceVerified`). Permission `tenant_domain.domains.reports`.
- `GET /api-keys/activity-report` and `GET /api-keys/rotation-audit` return the report **unwrapped** (`{from, to, summary, rows}`), optional `from`/`to` ISO datetimes (default: trailing 90 days). Permission `api_key.reports.read`.

**Built:** DTOs and service methods in `services/platform/{apiKey,domain}.*` (lenient: counts coerced, every field defaulted or nullish, statuses and severities kept as strings), `components/admin/ApiKeyReports.tsx` (two read-only cards on the API keys screen), `components/admin/DomainReportCard.tsx` (health card on the domains screen), a paged "Activity" timeline inside `DomainDetailModal` (reloaded after verify / SSL check), strings in all six languages, tests in `__tests__/tenantAdmin.service.test.ts`.

**Guards:** every report answer is dropped when the active organization changed meanwhile (and each card resets on a switch); the timeline drops answers for another domain or organization via a request sequence.

**Deviations:**
- The report and timeline permissions are separate from the list permissions, so a refusal shows a short "not available" note instead of an error toast (logged via the logger).
- No date-range picker: the reports use the server's 90-day default; `from`/`to` are not sent.
- The timeline shows action, severity, actor kind and time only; metadata is not rendered.

**Not verified:** not run against a live server; no component render tests (the repo has no render-test setup), so the cards and the modal timeline were checked only by typecheck and the service tests.

---

## Review fixes — 2026-10-10 (reports and domain timeline)

Contract re-check against `api_key.report.service.ts`, `tenant_domain.report.service.ts` and the timeline route: DTO shapes, wrappers and paths match; no change needed.

**Fixed (`components/admin/DomainDetailModal.tsx`):**
- "Show more" derived the next page from `rows / 20`; the server clamps the page size per tenant, so a smaller page would repeat or skip rows. It now uses the last page the server answered, and de-duplicates rows by `auditLogId`.
- A failed "show more" replaced the already loaded rows with the "not available" note; the loaded rows are now kept.
- An answer that arrived after an organization switch was dropped but left the spinner running forever; it now ends in the "not available" note.

**Tests:** refused timeline and report (403), and the encoded domain id in the timeline path.

**Known, not changed:** the activity report only covers keys *created* in the window (server behavior; the card text already says so). Still not run against a live server; no component render tests.
