<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/i18n · modules/localization · modules/feature_flags/{module.json,server/*} · modules/feature_gate
  3. phases/README.md
  4. phases/platform/README.md (P1)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
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
