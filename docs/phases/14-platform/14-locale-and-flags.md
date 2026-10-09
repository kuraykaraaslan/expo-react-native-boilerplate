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
- [ ] Server error messages are shown as returned; client strings stay in `locales/*.json`. Extend the parity guard if new keys are added.

## 14.2 Feature flags

- [ ] `services/platform/flags.{dto,service.client}.ts` (add `platform/` to the K6 domain list): `POST /feature-flags/evaluate` (and `POST /experiments/evaluate` + `/convert` if experiments are wanted) — verify body (keys + subject attributes) and response.
- [ ] `useFeatureFlag(key)` hook backed by a store: fetch on sign-in and tenant switch, cache in MMKV, refresh on resume, safe default `false` when the call fails. No flag logic in screens beyond reading the hook.
- [ ] Flag management (create/override) is out of scope (P2).

## 14.3 Feature gates (plan limits)

- [ ] `feature_gate` has no routes: the app sees it only as error responses when a plan limit or feature is blocked. Add the gate error code(s) to the Phase 2 error classification and show an "upgrade your plan" state instead of a generic failure. Record the exact code/shape found in the server source.

## Files touched / created

- New: `services/platform/flags.*`, `libs/useFeatureFlag.ts`, `stores/flagStore.ts`
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

## ✅ CODED — 2026-10-09

**Contract check (server source):**
- Locale: the server reads `Accept-Language` only (`auth.i18n.resolveLocale` keeps the primary subtag; its auth dictionaries cover `en tr es`, everything else falls back to English). There is no locale header other than that one, and device sessions carry no fingerprint, so the header can change freely.
- Flags: `POST /feature-flags/evaluate` with `{}` (no `key`) answers `{ flags: { [key]: boolean } }`; the subject defaults to the caller's `userId`. Needs `feature_flags.flags.evaluate`, which any tenant user has.
- Gates: `feature_gate` throws `AppError(…, 403, FEATURE_NOT_AVAILABLE)`; its messages are fixed English strings ("This feature is not available on your current plan" / "You have reached the limit…"). Billing adds `QUOTA_EXCEEDED` and `SEAT_LIMIT_REACHED`.

**Built:** `libs/serverLocale.ts` (explicit table, `Accept-Language` set in `libs/axios.ts` on every request), `services/platform/flags.*`, `stores/flagStore.ts` (MMKV, per tenant), `libs/useFeatureFlag.ts` (`useFeatureFlag`, `refreshFlags`, `useFlagsSync` mounted in the drawer layout: mount, tenant switch, app resume), `planGate` on `normalizeApiError` + `ERRORS.PLAN_UPGRADE_REQUIRED` in all six languages. Tests: `__tests__/flags.test.ts`.

**Deliberate deviations:**
- The `localization` reference-data pickers (country / currency / timezone) were not built: the app has no screen that needs them yet.
- The upgrade state is the translated error message (toast / inline error), not a dedicated screen; no screen is gated by a flag yet.
- Experiments (`/experiments/evaluate`, `/convert`) were not wired.
- Language-change push to `user_preferences` already existed from Phase 4; no change.
- The "server-produced message comes back in the chosen language" criterion needs a live check against a deployed server.
