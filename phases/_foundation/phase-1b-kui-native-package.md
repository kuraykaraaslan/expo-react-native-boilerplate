<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference
  3. phases/README.md (§Locked decisions)
  4. phases/_foundation/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 1B — Make kui-native consumable as a git package

**Goal:** Make the `kui-native` repo (`C:/Users/kuray/Documents/Projects/KUInative`, `git@github.com:kuraykaraaslan/kui-native.git`) importable when written as a git dependency in another Expo app's `package.json`, **without any alias tricks**. Then tag the first release.

> **This phase's work is done in the KUInative repo and committed there.** In the boilerplate, only this file is updated in this phase.
> **Owner decision (fixed, 2026-09-24):** kui-native is installed as a git package. Changes may be made in KUInative for packaging. The showcase app (`app/`, `modules/showcase/`) must keep working.

## Current blockers (findings)

- There are **131 `@/` imports** in `modules/ui` and `libs` (`@/libs/theme` ×50, `@/libs/utils/cn` ×79, `@/libs/utils/typography` ×2). In a consumer app, `@/` resolves to the **consumer's** root. The boilerplate's babel `module-resolver` silently maps `@/libs/theme` to the boilerplate's own `libs/theme/` folder → the wrong module, without even an error.
- All runtime packages (`expo`, `react`, `react-native`, `nativewind`, `reanimated`, …) are in `dependencies`. When installed as a git dependency, npm tries to install these nested → risk of **two React copies** ("Invalid hook call").
- The `libs/theme.ts` tokens are fixed (`primary: #3b82f6`). There is no way for the consumer to supply its brand color (boilerplate: `#f4511e`). `useThemeTokens()` always returns blue.
- The `modules/ui/index.ts` barrel exports **everything**: `MapView` (`react-native-maps`, `leaflet`), `VideoPlayer` (`expo-video`), `FileInput` (`expo-document-picker`). Even importing a single `Button` from the barrel makes Metro resolve all of these modules.
- The repo has no tags at all. There is no version for the consumer to pin.

## 1B.1 Relative imports

- [ ] All `@/…` imports in `modules/ui/**` and `libs/**` are converted to **relative paths** (`@/libs/utils/cn` → `../../libs/utils/cn`, etc.). Including test files.
- [ ] `app/` and `modules/showcase/` (the showcase host) may keep using `@/`, since they are not shipped with the package.
- [ ] `eslint.config.js` → a `no-restricted-imports` rule is added for `modules/ui/**` and `libs/**`: `@/*` is forbidden. CI catches regressions.

## 1B.2 Dependency layout

- [ ] `peerDependencies` (consumer provides): `react`, `react-native`, `expo`, `expo-image`, `expo-router`, `nativewind`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-svg`, `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/react-native-fontawesome`, `clsx`, `tailwind-merge`, `zustand`. Ranges are written with SDK 57's versions.
- [ ] `peerDependenciesMeta` → **optional**: `expo-video`, `expo-document-picker`, `expo-clipboard`, `react-native-maps`, `leaflet`, `react-leaflet`, `countries-list`, `@fortawesome/free-brands-svg-icons`, `@fortawesome/free-regular-svg-icons`. Only a consumer that uses the relevant component installs them.
- [ ] The same packages **remain** in `devDependencies` (for the showcase and tests). The `dependencies` field is emptied or left only for pure-JS packages that need not be peers.
- [ ] Showcase-specific packages (`react-dom`, `react-native-web`, `expo-status-bar`, `expo-linking`, `expo-constants`) only in `devDependencies`.
- [ ] There **must not be** a `prepare` / `postinstall` script in `package.json`. If there is, npm also installs devDependencies when installing the git dependency and the install takes minutes.

## 1B.3 Package surface

- [ ] `package.json` → `files`: `["modules/ui", "libs/theme.ts", "libs/utils", "global.css", "nativewind-env.d.ts", "!**/*.test.ts", "!**/*.test.tsx"]`. The showcase, `brand/`, `docs/` and `dist/` do not go into the package.
- [ ] `main` **stays** as `expo-router/entry` for the showcase. The consumer uses deep paths. An `exports` field is **not added**, because adding it would close off deep imports.
- [ ] A **"Usage as a consumer"** section is added to the README. Supported entry points:
  - `kui-native/modules/ui/<Component>` — per-component deep import (**recommended**, does not pull in optional peers)
  - `kui-native/modules/ui` — full barrel (all optional peers must be installed)
  - `kui-native/libs/theme` — theme API
  - `kui-native/libs/utils/cn`, `kui-native/libs/utils/tailwind-tokens`
- [ ] The README spells out the consumer setup step by step: tailwind `content`, `theme.extend.colors`, jest `transformIgnorePatterns`, applying the theme `vars()` at the root.

## 1B.4 Theme override API

- [ ] `libs/theme.ts` → `configureTheme({ light?: Partial<TokenMap>, dark?: Partial<TokenMap> })` is added. It merges on top of the default tokens and regenerates `themes` (vars) and `tokenMaps` **together**. That way className and `useThemeTokens()` return the same color.
- [ ] Documented to be called **once** at app startup, before the first render. If it is not called, today's behavior is preserved exactly (backward compatible).
- [ ] `useThemeMode` is not persisted today. The package **does not add** persistence: the consumer feeds it via `setMode` from its own store (boilerplate: MMKV). This is stated explicitly in the README.
- [ ] `TokenMap` and the token key types are exported. The consumer writes the override type-safely.

## 1B.5 Versioning

- [ ] `version` `0.1.0` → `0.2.0` (the package surface changed).
- [ ] `CHANGELOG.md` is created. First entry: relative imports, peer layout, `configureTheme`.
- [ ] After committing, the `v0.2.0` tag is created and pushed to `origin` (`git push origin v0.2.0`). **The push is done with the owner's approval.**

## 1B.6 Verification (inside KUInative)

- [ ] `npm install && npm run typecheck && npm test` → showcase and tests are green (relative imports did not break anything).
- [ ] `npm run web` → the showcase opens.
- [ ] `git grep -n "from \"@/" -- modules/ui libs` → **zero** results.
- [ ] `npm pack --dry-run` → the output contains only what is in the `files` list; no `app/`, `modules/showcase/` or test files.

## Files touched / created (in the KUInative repo)

- Changed: `modules/ui/**` (import paths), `libs/theme.ts` (+`configureTheme`, type exports), `package.json` (peer / dev / files / version), `eslint.config.js`, `README.md`
- New: `CHANGELOG.md`
- In the boilerplate: only this file's `CODED` stamp

## Reuse

- `toVars()` in `libs/theme.ts`: `configureTheme` reuses it; a second vars generator is not written.
- `libs/utils/tailwind-tokens.js`: unchanged. As long as the token **names** stay fixed, the consumer `require`s it directly.

## Acceptance criteria

- In KUInative, `@/` imports remain only in `app/` and `modules/showcase/`.
- `npm pack --dry-run` is clean. There is **no** React / RN / Expo in `dependencies`.
- After `configureTheme({ light: { primary: "#f4511e" } })`, both `bg-primary` and `useThemeTokens().primary` return orange (proven with a unit test).
- The `v0.2.0` tag exists on origin.

## Risks

- **A leak in the relative import conversion:** if a single `@/` remains, it resolves to the wrong file in the consumer and gives no error. Mitigation: use the ESLint rule together with the `git grep` check.
- **Repo access:** the repo is **public** (owner confirmed, 2026-09-24). CI and EAS clone over https without credentials. If the repo is made private in the future, a deploy-key step must be added to Phase 1C.
- **Breaking the showcase:** if packages moved to peers are not kept in devDependencies, the showcase install breaks. With every move, `npm install` + `npm run web` are repeated.
- **Barrel weight:** if the consumer imports from the barrel and optional peers are missing, Metro throws "Unable to resolve react-native-maps". The README and the boilerplate rule make deep imports mandatory.

---

## ✅ CODED — 2026-09-24 · KUInative `main` = `887ad72`, tag `v0.2.0` on origin

KUInative branch `feat/consumable-package` (base `main` 72705f0): `d9f71ea` (relative imports + lint rule) · `ddc0ea8` (peer / files) · `e576edc` (`configureTheme`) · `887ad72` (README, CHANGELOG, 0.2.0)

Verification: typecheck 0 errors · jest 65 suites / 714 tests passed (baseline 64 / 709) · lint clean · `npm pack --dry-run` contains 137 files; no `app/`, `modules/showcase/` or test files · web export successful.

With the owner's approval, a fast-forward merge to `main` was done, the `v0.2.0` annotated tag was created and `git push origin main v0.2.0` was run.

**Deliberate deviations:**
- The `tokenMaps` / `useThemeTokens()` return type is `TokenMap & Record<string, string>`. So that the 7 existing call sites that read tokens with a computed string do not break. The `configureTheme` overrides are strictly typed.
- `themes` is now an object with getters. On native, `vars()` returns an empty object and the values are kept in a WeakMap, so updating in place is not possible. The usage shape did not change.
- `modules/showcase/data/showcase.generated.ts` was re-synced. Only the import lines in the stored source copies changed.
- No package component uses the optional peers `countries-list` and `@fortawesome/free-brands-svg-icons` (only the showcase uses them). They can be dropped in the future.
