<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/terms_consent · modules/privacy · modules/audit_log
  3. phases/README.md
  4. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# compliance — agreements, privacy requests and audit trail (Phase Plan index)

## Why (context)

App stores require an in-app way to see the terms and privacy policy, and (Apple guideline 5.1.1(v), Google Play data-deletion policy) a way to **delete the account from inside the app**. The server side exists as `terms_consent` (versioned agreements, acceptances, consent records), `privacy` (data-subject requests: access/dossier, erasure) and `audit_log` (append-only trail).

## Order

| Phase | File | Topic | Priority |
|-----|-------|------|---------|
| 13 | [phase-13-consent-privacy.md](phase-13-consent-privacy.md) | Agreements, consent, privacy requests, account deletion, audit viewer | ⬜ Pending |

## Locked decisions

- **C1 — Account deletion is a privacy request, not a bespoke endpoint.** The app creates an erasure request through `privacy` and shows its status; it does not delete rows itself. If the server does not let a data subject create their own request from a device token, that is a server gap to record, as for K4.
- **C2 — Agreement text is rendered, never copied into the bundle.** Content comes from the server version the user must accept, with its hash/version stamped on acceptance.
- **C3 — The audit viewer is admin-only and read-only.** Anonymize / purge / export / cross-tenant stay on the web.

## Dependency graph (summary)

- Phase 13 depends on Phase 4 (registration/login flow, where blocking acceptance appears) and Phase 5 (active tenant). Account deletion also touches Phase 8's `unregisterPush` cleanup if that has shipped.

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
