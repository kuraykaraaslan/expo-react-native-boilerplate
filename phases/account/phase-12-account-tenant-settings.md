<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/account/module.json · modules/tenant_setting/{module.json,server/*} · modules/tenant_branding/{module.json,server/*}
  3. phases/README.md (§Locked decisions K2, K5)
  4. phases/account/README.md (A1–A3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 12 — Account audit, tenant settings and branding

**Goal:** Every `account` route the client touches matches the server contract, a tenant admin can edit the tenant's settings from the app, and the shell takes its logo and colors from the active tenant's branding.

Modules: `account`, `tenant_setting`, `tenant_branding`. Priority 1.

## 12.1 Account audit

- [ ] Check each `/auth/me/*` route against its client DTO (`profile`, `preferences`, `sessions`, `social-accounts`, `tenants`, `notifications`) and fix drift as Phase 3 did.
- [ ] Add `GET /auth/me/device-info` to the sessions screen if it carries "this device" details (verify what it returns before using it).
- [ ] Add the account profile fields the server exposes but the screen omits (locale, timezone, avatar URL — upload itself is Phase 15).

## 12.2 Tenant settings

- [ ] Read `tenant_setting` DTOs and the `*.setting.keys.ts` files that modules declare; choose the allowlist for the app (A3): general, locale/timezone, registration/verification policy, and anything an OWNER/ADMIN reasonably changes on a phone.
- [ ] `services/tenant/settings.{dto,service.client}.ts` (K6): `GET/PUT /settings` (tenant admin) — keep `/admin-settings` and `/modules` out unless the contract shows a need.
- [ ] `app/(drawer)/settings/tenant/settings.tsx`: grouped form with per-key validation, dirty tracking, save with haptic, error mapping; read-only for non-admins.
- [ ] Tests with the server's real shapes (typed values come back as strings — convert once at the service boundary).

## 12.3 Branding

- [ ] Confirm whether `GET /settings/public` works unauthenticated for a tenant path; if so it also lets the login screen show the tenant's logo/colors before sign-in.
- [ ] `services/tenant/branding.{dto,service.client}.ts`: `GET /settings/public` (and `GET /settings/branding` for admins if useful).
- [ ] `libs/theme`: map `primaryColor`/accent/font to the existing tokens through kui-native's theme override API (K5: no patching). Fall back to the default palette on any missing or low-contrast value (contrast guard).
- [ ] Cache the last branding per tenant in MMKV so cold start does not flash the default theme; refresh on tenant switch and on app resume.
- [ ] Ignore `customCss` (A2).

## Files touched / created

- New: `services/tenant/{settings,branding}.{dto,service.client}.ts`, `app/(drawer)/settings/tenant/settings.tsx`, `libs/theme/branding.ts`
- Changed: `libs/theme/*`, `stores/tenantStore.ts` (branding cache) or a new `stores/brandingStore.ts`, account DTOs/screens as the audit finds, `locales/*.json`
- Test: settings read/write shapes, branding mapping with fallback and contrast guard, tenant switch swaps theme

## Reuse

- Phase 5 `activeTenantId` / switcher; Phase 1D tokens and fonts; `@/components/ui` `Input`, `Switch`, `Select`, `Card`.

## Acceptance criteria

- Changing a setting in the app is reflected on the web admin and vice versa.
- A `USER` cannot edit settings (read-only or hidden).
- Switching tenants changes logo and accent color without a restart; cold start shows the cached branding, not a flash of default.
- An unreadable or low-contrast brand color falls back to the default and never makes text illegible.
- `npm run registry:snapshot` is up to date.

## Risks

- **Brand colors vs. accessibility.** Arbitrary tenant colors can break contrast on buttons and badges; the guard is mandatory.
- **Font loading.** A tenant font name the app has not bundled must fall back to Inter (Phase 1D), never block rendering.
- **Settings key drift.** Modules add keys over time; the allowlist is explicit so new keys do not appear half-supported.

---

## 🟡 Progress — 2026-10-08 (12.2 done; 12.1 and 12.3 open)

**12.2 tenant settings — done** (on `main`). Contract read from `tenant_setting/server/settings.route.ts`: `GET /settings` → `{success, settings}` (every key as a string, secrets masked `***SET***`; permission `tenant_setting.config.read`), `POST /settings` `{settings}` → `{success, settings: <applied only>, pending: [{key, approvalItemId}]}` (permission `tenant_setting.config.update`; with the tenant's maker-checker gate on, gated keys are **queued** and absent from `settings`). The route's `PUT` is "get by keys", not an update.
- `utils/tenantSettings.ts`: the allowlist (A3) — `defaultMemberRole` (USER|ADMIN; OWNER is excluded by the server), `tenantMemberDualControl` (boolean string), `defaultLanguage` (the app's six languages) — taken from the server's field files, since the field definitions are TypeScript metadata, **not served by any API** (so a generic server-driven form is not possible). `pickSettings` / `changedSettings` (send only what changed).
- `saveTenantSettings` returns `{settings, pending}`; `updateTenantSettings` keeps its old shape. Keys parked for approval are shown at the value in force and announced ("N change sent for approval").
- `app/(drawer)/settings/tenant/settings.tsx` (+ tile on the organization page): admin-only (non-admins see a read-only note and no request is made), reloads on tenant switch, save disabled until something changed. Strings in all six locales; 5 new tests (149 total).

**Still open:** 12.1 account audit (`/auth/me/*` DTO drift, `device-info`), 12.3 branding — see the finding that `GET /settings/public` is a **GUEST** route (works before sign-in) returning `{success, settings: {brandName, brandPrimaryColor, …}, tenant: {name}}`, and that kui-native's `configureTheme` merges onto defaults and does **not** re-render mounted components, so branding must be applied at startup (from an MMKV cache) or on a tenant switch.

---

## ✅ CODED (12.2 + 12.3) — 2026-10-08

On `main`. Typecheck 0 errors, jest 164/164 (21 new across 12.2/12.3), web export OK. **12.1 (account audit) was not redone** — see below.

**12.3 branding — what shipped**
- `services/tenant/branding.dto.ts` + `getPublicBranding` (`GET /settings/public`, **GUEST** scope: no token, so it works on the login screen and for a fresh install's default tenant). Answer: `{success, settings: {brandName, brandPrimaryColor, …}, tenant: {name}}`; values are strings and unset keys are absent.
- `libs/theme/brandColor.ts` (pure, tested): `normalizeHex` + `deriveBrandTokens`. From one hex it derives primary / hover / active / subtle / foreground / focus for light **and** dark. **Accessibility guard**: a color under 3:1 against the white surface is rejected (the default palette stays); in dark mode the color is lightened until it is ≥ 3:1 on the dark surface (measured on the *rounded* hex — an unrounded check once let 2.9956 through); button text is whichever of black/white reads better (≥ 4.5:1).
- `libs/theme/branding.ts`: `applyBrandColor` layers the tenant tokens over `BASE_THEME` (now exported from `brand.ts`) with kui-native's `configureTheme`; `applyCachedBranding` (synchronous) and `syncBranding` (fetch + validate + cache, never throws). `ThemeProvider` applies the cache before the first render, applies a switched-to tenant's cache at once, then refreshes it.
- `stores/brandingStore.ts`: persisted per-tenant colour cache (MMKV) + a **non-persisted** "applied" store with a version counter. (First version put the applied flag in the persisted store: writing it at module scope during the **web server render** threw "Tried to access storage on the server" and the web build returned 500 — caught by the screenshot run, not by jest. The counter exists because re-applying the *same* tenant would otherwise not re-render the theme root.)
- Rule: a colour fetched for the tenant already on screen is cached and used on the **next launch**; it is applied immediately only when the tenant changed or was never seen — the palette must not change under the user mid-task. (`configureTheme` merges onto defaults, not onto an earlier call, and does not re-render mounted components.)
- Screenshots: `.junk/screenshots/phase-12-account-tenant-settings/` (4 images; the mock tenant's purple shows on the avatar, role badge and buttons).

**Deliberate deviations**
- **Only the primary colour is applied.** Logo (`brandLogoLight/Dark`), `brandName`, favicon, secondary colour, auth wallpaper and font are not used; `customCss`/`customJs` are ignored by design (A2). Logos need an image slot in the auth shell and header — a follow-up (and Phase 15's upload/cache story).
- **Hex tokens read through `useThemeTokens()`** (icon colours) update on the next render of each component, not instantly; className-based colours update with the theme root.
- No admin editing of branding (A1).
- **12.1 not redone**: the `/auth/me/*` DTOs (profile, preferences, sessions, social accounts, tenants, notifications) were aligned against the server in Phases 3–5 with real-shape fixtures; `GET /auth/me/device-info` is still unused. A fresh route-by-route diff was not done in this pass.
- 12.2 (settings screen) is described above in the progress note.

**Not verified:** nothing ran against a live server or a device; the live palette change was only seen in the web build (CSS variables). On native, NativeWind's behaviour when the root's vars change at runtime is unconfirmed — the startup/tenant-switch paths apply the palette before or at a re-render of the root, but a native run is needed to confirm no component keeps the old hex.
