<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/api_key/{module.json,server/*} · modules/tenant_domain/{module.json,server/*} · modules/tenant_session
  3. phases/README.md (§Locked decisions K2)
  4. phases/platform/README.md (P1, P2)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
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
