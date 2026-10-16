<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/i18n · modules/localization · modules/feature_flags/{module.json,server/*} · modules/feature_gate
  3. docs/phases/README.md
  4. docs/phases/14-platform/README.md (P1)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: docs/phases/README.md §Order
-->

# Phase 14 — Server-aligned locale, feature flags and gates

**Goal:** The language the user picks reaches the server (so emails and error messages come back in it), and the app can ask the server which features are on for this user and tenant.

Modules: `i18n`, `localization`, `feature_flags`, `feature_gate`. Priority 2.

## 14.1 Locale

- [ ] Read how the server resolves the request locale (`i18n` app-locale resolution; header, user preference, tenant default) and which codes it accepts (`localization` locale/country/currency enums).
- [ ] Send the chosen locale on every request via the interceptor (single place, `libs/axios.ts`), using the header the server actually reads.
- [ ] Keep `user_preferences.language` in sync with the picker (already stored per Phase 4); map the client's six languages (`en tr de es fr it`) to the server's codes explicitly, no string slicing.
- [ ] Use `localization` reference data only where it replaces hand-written lists (country / currency / timezone pickers) — fetch lazily, cache in MMKV.
- [ ] Server error messages are shown as returned; client strings live in `modules/<module>/dictionaries/*.json` and can be overridden from the server (Phase 14A). Extend the parity guard if new keys are added.

## 14.2 Feature flags

- [ ] `modules/platform/flags.{dto,service.client}.ts` (add `platform/` to the K6 domain list): `POST /feature-flags/evaluate` (and `POST /experiments/evaluate` + `/convert` if experiments are wanted) — verify body (keys + subject attributes) and response.
- [ ] `useFeatureFlag(key)` hook backed by a store: fetch on sign-in and tenant switch, cache in MMKV, refresh on resume, safe default `false` when the call fails. No flag logic in screens beyond reading the hook.
- [ ] Flag management (create/override) is out of scope (P2).

## 14.3 Feature gates (plan limits)

- [ ] `feature_gate` has no routes: the app sees it only as error responses when a plan limit or feature is blocked. Add the gate error code(s) to the Phase 2 error classification and show an "upgrade your plan" state instead of a generic failure. Record the exact code/shape found in the server source.

## Files touched / created

- New: `modules/platform/flags.*`, `libs/useFeatureFlag.ts`, `stores/flagStore.ts`
- Changed: `libs/axios.ts` (locale header, gate error class), `app/(drawer)/settings/change-language.tsx`, `locales/*.json`
- Test: locale header sent, flag evaluation default-off on failure, gate error mapped

## Reuse

- Phase 2 error classification; Phase 4 preference sync; MMKV stores.

## Acceptance criteria

- Switching the app language changes the language of a server-produced message (e.g. a validation error or an emailed reset).
- A flag turned on for the tenant in the web admin enables the gated screen after a refresh and turning it off hides it.
- A blocked plan feature shows an upgrade state, not a raw error.
- `npm run registry:snapshot` is up to date.

## Risks

- **Flag flicker.** Showing gated UI before the first evaluation completes; default-off plus a cached last value avoids it.
- **Header spoofing assumptions.** If the server derives locale from the user preference, the header is only a hint; do not rely on it for correctness.
- **Locale-code mismatches** (`tr` vs `tr-TR`) silently falling back to English.

---

## ✅ CODED (14.1 header, 14.2, 14.3) — 2026-10-15

On `main`. Typecheck 0 errors, jest 305/305 (10 new), web export OK. No visible UI of its own, so no screenshots: the flag hook has no gated screen to show yet, and the plan-limit copy appears as a toast through the existing error path.

**Corrections to this plan** (read from `feature_flags`, `feature_gate`, `common` server source)
- **14.1 is mostly covered by Phase 14A** (remote translations): the language picker, the profile sync and the dynamic language list are done there. What was missing was telling the **server** the language: its `common.locale` normalises `Accept-Language` input, so `libs/axios.ts` now sends `Accept-Language` (the i18next language) on every request unless a caller already set one. Not done: the `localization` reference data for country/currency/timezone pickers (no screen needs them yet).
- **Flags: one call evaluates everything.** `POST /feature-flags/evaluate` with an empty body answers `{flags: {key: boolean}}` for the signed-in user (permission `feature_flags.flags.evaluate`, any member). A single-key call and `attributes` targeting exist; experiments (`/experiments/evaluate`, `/convert`) were not wired.
- **There is no `feature_gate` route** — the app only sees it as a **403** carrying `code`: `FEATURE_NOT_AVAILABLE`, `QUOTA_EXCEEDED` or `SEAT_LIMIT_REACHED` (`common/app-error.ts`), with an English sentence in `message`.

**What shipped**
- `modules/feature_flags/feature_flags.{dto,service.client}.ts` (module name mirrors the server's), `stores/flagStore.ts` (persisted per-tenant cache), `libs/featureFlags.ts`: `refreshFlags` (never throws; keeps the cached values on failure; drops an answer that arrives after a tenant switch), `useFeatureFlag(key)` (**OFF** unless the active tenant's cache says on — no flicker, no accidental exposure) and `useFlagsSync()` (mounted in the drawer layout: on sign-in, tenant switch, and resume with a 60 s throttle).
- `libs/apiError.ts`: the three gate codes map to translated upgrade copy (`API_ERRORS.PLAN_FEATURE|PLAN_QUOTA|PLAN_SEATS` in the `common` dictionary, six languages) with `planLimit: true`; `isPlanLimitError(err)` lets a screen show an upgrade state instead of a failure.
- Tests: evaluation body and map, cache/failure/stale-tenant behaviour, the `Accept-Language` header (and that a caller's own header wins), the three gate codes and that other 403s are untouched.

**Deliberate deviations**
- No screen consumes `useFeatureFlag` yet, and no screen shows a dedicated "upgrade" empty state: both are ready for the screens that need them (Phases 15–18 will be the first). The generic toast now carries the upgrade message.
- Flag management and experiments are out of scope (P2); flags are evaluated for the user only (no custom attributes passed by the app).
- `FEATURE_NOT_AVAILABLE` is assumed to always mean "plan" (that is its only use in the gate); if the server reuses it for other denials the copy would be misleading.

**Not verified:** nothing ran against a live server or a device; whether the server really honours `Accept-Language` for every message was read from `common.locale`, not exercised.
