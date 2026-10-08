<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/{i18n,localization,feature_flags,feature_gate,storage,media_gallery,drive,websocket,messaging,search,navigation,api_key,tenant_domain,tenant_session}
  3. phases/README.md
  4. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# platform — cross-cutting capabilities (Phase Plan index)

> Priority 2 modules that most apps want eventually but that no screen in Phases 0–13 depends on. Each phase is independent unless noted; build in the order a product needs them.

## Order

| Phase | File | Topic | Modules | Priority |
|-----|-------|------|---------|---------|
| 14 | [phase-14-locale-and-flags.md](phase-14-locale-and-flags.md) | Server-aligned locale, feature flags and gates | `i18n`, `localization`, `feature_flags`, `feature_gate` | ⬜ Pending |
| 15 | [phase-15-files.md](phase-15-files.md) | Uploads, avatar, media gallery, drive | `storage`, `media_gallery`, `drive` | ⬜ Pending |
| 16 | [phase-16-realtime-messaging.md](phase-16-realtime-messaging.md) | Socket.IO transport and conversations | `websocket`, `messaging` | ⬜ Pending |
| 17 | [phase-17-search.md](phase-17-search.md) | Global search, saved searches | `search`, `navigation` | ⬜ Pending |
| 18 | [phase-18-tenant-admin.md](phase-18-tenant-admin.md) | API keys and domains (admin read/manage) | `api_key`, `tenant_domain`, `tenant_session` | ⬜ Pending |

## Locked decisions

- **P1 — Each phase starts with a contract check.** Routes below come from `module.json`; request/response shapes are read from the server source before any DTO is written (the Phase 3 lesson).
- **P2 — Admin-only surfaces are optional and read-first.** Mobile gets list/inspect/revoke; creation-heavy configuration stays on the web unless the owner asks.
- **P3 — New native modules need a development build.** Phases 15 and 16 add native or socket dependencies; they are verified on a dev build, not Expo Go.

## Dependency graph (summary)

- Phase 14 has no dependencies beyond Phase 4/5. Its locale half also touches Phase 4's language picker.
- Phase 15 is needed by the avatar upload in Phase 12 (profile) and optionally by Phase 16 attachments.
- Phase 16 depends on Phase 2 (tokens) and Phase 9 (badge/unread concepts); its tokens are tenant-scoped (K2).
- Phase 17 and 18 are independent.

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
