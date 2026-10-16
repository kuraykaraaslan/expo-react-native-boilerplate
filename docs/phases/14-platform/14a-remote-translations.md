<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — modules/translation (branch feat/translations-db, see "Server contract")
  3. docs/phases/README.md
  4. docs/phases/14-platform/README.md (P1)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: docs/phases/README.md §Order
-->

# Phase 14A — Remote translations (database-backed languages)

**Goal:** A language can be added or a text corrected on the server and reach the app without a store release. The chosen language is kept on the device and is never waited for; once picked, every text is in that language.

Module: `localization`. Priority 1 (customer request).

## Why

The customer (Daniel Yordanov, 2026-10-14) rejected texts that live only in the app bundle: every text change would need a new build and a store review. Languages must live in database tables, editable at any time, while the chosen language stays cached on the device.

## Owner decisions (fixed, 2026-10-14)

1. **Routes live in next-boilerplate** (an exception to root decision 2). *(2026-10-16: they go in a new `translation` module on branch `feat/translations-db`; `localization` stays a reference-data module. The URLs stay `/localization/languages…`, so the client did not change.)*
2. **Dictionaries are split per module**, mirroring next-boilerplate: `modules/<module>/dictionaries/<lang>.json`, under the web's module ids (`account`, `tenant_member`, `audit_log`, `privacy`, …). `services/` was renamed to `modules/` for this.
3. **Versions per module.** Only modules whose version changed are downloaded.
4. **One i18next namespace, web keys.** All module dictionaries merge into `common`. Keys are next-boilerplate's flat `<module>.<area>.<slug>` (`auth.login.title`; `keySeparator: false`); every key starts with its module id (tested). Where the text is the same, mobile uses the web's key, so one translation serves both.
5. **The server merges common + platform-specific texts**; the client sends `platform` and does no platform logic.
6. **The database overrides the code (2026-10-15).** English and the shipped translations stay in the JSON dictionaries; the server's table holds one row per key, only for new languages and corrected texts, cached in Redis. `messages` holds those rows only; the app applies them over its bundled texts.

## Server contract

Both are **GUEST** routes under the tenant prefix (the login screen is translated before sign-in).

| Path | Body | Response |
|---|---|---|
| `GET …/localization/languages?platform=<android\|ios\|web>` | — | `{ languages: [{ code, name, flag?, versions: { <module>: "<version>" } }] }` |
| `POST …/localization/languages/{code}` | `{ platform: "android" \| "ios" \| "web", module }` | `{ code, version, platform, module, messages }` |

- `version` changes whenever any text of that module changes in that language (server: max `updatedAt` + row count, so a delete counts too).
- `versions` lists only the modules with texts for that platform; the list holds only languages the tenant enables **and** that have texts (a JSON dictionary or a row) — otherwise the app would take an empty `versions` as a complete language and switch to an all-English UI.
- `flag` is an ISO 3166 country code (`"BG"`, from `flagCountry()`); the app shows it as an emoji (`flagEmoji`).
- `messages` is flat, like `modules/<module>/dictionaries/en.json`: `{ "auth.login.title": "…" }`.
- The server maps `android`/`ios` → its `mobile` rows; `web` must be accepted (the Expo web build sends `Platform.OS === "web"`).
- The app downloads every stale module of a language at once (15 modules today): the guest rate limit must allow that burst.

## Tasks

- [x] `modules/localization/translation.{dto,service.client}.ts` — contract above, Zod-parsed.
- [x] `stores/translationStore.ts` — language list + dictionaries per language and module (MMKV, persist v1; a v0 cache is dropped). `switchingTo` is not persisted.
- [x] `libs/i18n.ts` — bundled module dictionaries + cached remote ones, applied before the first render; remote wins key by key; fallback English.
- [x] `libs/translations.ts` — `syncTranslations` (startup + resume, 5 min throttle), `selectLanguage` (download first, switch only when complete), `useLocales` (server list once known, else the six bundled languages).
- [x] Profile language that cannot be downloaded yet is deferred: toast, retried on every resume, switched to with a toast; a language the user picks meanwhile wins.
- [x] Pickers (`LangSwitcher`, `PreferencesCard`, tenant default language) use the dynamic list; spinner / "Downloading language…" while downloading; the header switcher now also saves the choice to the profile.
- [x] Split `locales/*.json` into module dictionaries (lossless, verified); `locales/` removed.
- [x] Tests: `__tests__/translations.test.ts`, `__tests__/locales.test.ts` (parity per module and language, no shared section).
- [x] Keys in next-boilerplate's flat format, `dictionaries/` under the web's module ids (`4165226`).
- [x] `?platform=` on the language list; ISO country code → flag emoji.
- [ ] Server: next-boilerplate `translation` module (table, Redis cache, both routes) — in progress on `feat/translations-db`.
- [ ] Live verification against the server and on a device.

## Files touched / created

- New: `modules/localization/translation.*`, `modules/*/dictionaries/{index.ts,<lang>.json}`, `stores/translationStore.ts`, `libs/translations.ts`, `__tests__/translations.test.ts`
- Changed: `libs/i18n.ts`, `libs/preferences.ts`, `app/_layout.tsx`, `components/shell/LangSwitcher.tsx`, `components/account/PreferencesCard.tsx`, `app/(drawer)/settings/tenant/settings.tsx`, `__tests__/locales.test.ts`, AGENTS.md + editor rule mirrors, README
- Removed: `locales/`

## Acceptance criteria

- A text edited on the server shows in the app after a resume, without a new build.
- A language added on the server (e.g. `bg`) appears in the pickers and can be selected.
- The chosen language is on screen from the first render, offline included.
- A language the app does not ship is never shown half-translated.
- `npm run registry:snapshot` is up to date.

## Risks

- **Bundle size in MMKV.** Every downloaded language × module is cached; fine for a handful of languages, revisit if dozens are offered.
- **Server list is authoritative.** Once the list is known, a bundled language the server does not list is not offered.
- **Locale codes.** Codes are lowercased (`lowerCaseLng`); the profile language is reduced to the base code (`bg-BG` → `bg`).

---

## ✅ CODED (client) — 2026-10-15

Commits `d43b1e3` (remote translations), `b42523b` (`services/` → `modules/`), `eb2b5c9` (module dictionaries, per-module versions, deferred profile language, download spinner). Typecheck 0 errors, jest 295/295.

**Deliberate deviations:** none from the owner decisions above.

**Not verified:** the routes do not exist on the server yet, so nothing ran against a live server; the app was not run on a device or in the web build — the spinner and toasts were only exercised through tests.

**2026-10-15 — web key format** (`4165226`): keys moved to `<module>.<area>.<slug>` under the web's module ids; 46 keys reuse the web's key, 14 adopt the web's wording, 92 unused keys dropped; translation cache bumped to v2. Known gap: some short login texts (Sign In, Welcome back, Email…) are separate `auth.ui.*` keys, not yet linked to the web's.

**2026-10-16 — server plan aligned:** the language list sends `?platform=`; the server's ISO flag code is shown as an emoji. Typecheck 0 errors, jest 493/493. Open for the admin screen (later): mobile-only keys (`auth.ui.*`, …) are not in the server's JSON, so a "missing translations" list needs the mobile `en.json` files imported.
