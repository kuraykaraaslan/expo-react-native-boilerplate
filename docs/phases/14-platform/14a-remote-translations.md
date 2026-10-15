<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — modules/localization (routes written by the owner, see "Server contract")
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

1. **Routes live in next-boilerplate's `localization` module**, written by the owner (an exception to root decision 2).
2. **Dictionaries are split per module**, mirroring next-boilerplate: `modules/<module>/dictionary/<lang>.json` is the bundled copy of the server's `<module>` dictionary. `services/` was renamed to `modules/` for this.
3. **Versions per module.** Only modules whose version changed are downloaded.
4. **One i18next namespace.** All module dictionaries merge into `common`, so no `t()` call changes; a top-level section belongs to exactly one module (tested).
5. **The server merges common + platform-specific texts**; the client sends `platform` and does no platform logic.

## Server contract

Both are **GUEST** routes under the tenant prefix (the login screen is translated before sign-in).

| Path | Body | Response |
|---|---|---|
| `GET …/localization/languages` | — | `{ languages: [{ code, name, flag?, versions: { <module>: "<version>" } }] }` |
| `POST …/localization/languages/{code}` | `{ platform: "android" \| "ios" \| "web", module }` | `{ code, version, platform, module, messages }` |

- `version` changes whenever any text of that module changes in that language (e.g. max `updatedAt` of its rows).
- `messages` has the shape of `modules/<module>/dictionary/en.json`.
- Module names: `common`, `auth`, `user`, `tenant`, `compliance`, `localization`.
- `web` must be accepted: the Expo web build sends `Platform.OS === "web"`.

## Tasks

- [x] `modules/localization/translation.{dto,service.client}.ts` — contract above, Zod-parsed.
- [x] `stores/translationStore.ts` — language list + dictionaries per language and module (MMKV, persist v1; a v0 cache is dropped). `switchingTo` is not persisted.
- [x] `libs/i18n.ts` — bundled module dictionaries + cached remote ones, applied before the first render; remote wins key by key; fallback English.
- [x] `libs/translations.ts` — `syncTranslations` (startup + resume, 5 min throttle), `selectLanguage` (download first, switch only when complete), `useLocales` (server list once known, else the six bundled languages).
- [x] Profile language that cannot be downloaded yet is deferred: toast, retried on every resume, switched to with a toast; a language the user picks meanwhile wins.
- [x] Pickers (`LangSwitcher`, `PreferencesCard`, tenant default language) use the dynamic list; spinner / "Downloading language…" while downloading; the header switcher now also saves the choice to the profile.
- [x] Split `locales/*.json` into module dictionaries (lossless, verified); `locales/` removed.
- [x] Tests: `__tests__/translations.test.ts`, `__tests__/locales.test.ts` (parity per module and language, no shared section).
- [ ] Server routes in next-boilerplate `localization` (owner).
- [ ] Live verification against the server and on a device.

## Files touched / created

- New: `modules/localization/translation.*`, `modules/*/dictionary/{index.ts,<lang>.json}`, `stores/translationStore.ts`, `libs/translations.ts`, `__tests__/translations.test.ts`
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
