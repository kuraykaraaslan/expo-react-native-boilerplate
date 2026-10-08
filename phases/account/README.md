<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/account · modules/tenant_setting · modules/tenant_branding · modules/user_preferences
  3. phases/README.md
  4. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# account — account surface, tenant settings and branding (Phase Plan index)

## Why (context)

`account` owns zero tables and composes the `/auth/me/*` routes the client already uses (profile, preferences, sessions, social accounts, notifications, tenants) plus `GET /auth/me/device-info` and `GET /auth/me/security`. `tenant_setting` is the per-tenant key-value store (`/api/settings`, `/api/admin-settings`, `/api/modules`), and `tenant_branding` adds white-label chrome (`/api/settings/branding*`, `/api/settings/public`).

The client has a tenant-settings service method (`getTenantSettings` / `updateTenantSettings`) but no real screen or contract check, and its theme is a single palette.

## Order

| Phase | File | Topic | Priority |
|-----|-------|------|---------|
| 12 | [phase-12-account-tenant-settings.md](phase-12-account-tenant-settings.md) | Account audit, tenant settings, per-tenant branding | ✅ Coded 2026-10-08 (audit & logos open) |

## Locked decisions

- **A1 — Branding is read-only on the device.** Editing logos, CSS and presets stays on the web admin. The app only consumes the public branding of the active tenant.
- **A2 — No custom CSS on native.** `customCss` from `tenant_branding` is ignored; only colors, logo, favicon-as-icon and font name are mapped to tokens.
- **A3 — Settings are modeled, not free-form.** The settings screen renders a known allowlist of keys per module; it does not expose raw key-value editing.

## Dependency graph (summary)

- Phase 12 depends on Phase 5 (active tenant) and Phase 1B's kui-native theme override API.
- Phase 15 (files) is needed only if branding assets must be cached locally; Phase 12 uses remote URLs.

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
