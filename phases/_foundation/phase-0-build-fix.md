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

# Phase 0 — Get the build working

**Goal:** `npm install && npm run typecheck && npx expo start` should run cleanly; the drawer should be navigable in the emulator. No later phase is opened until this is verified.

## 0.1 Missing dependency

- [ ] `package.json` → add `@react-navigation/drawer`.
  - `app/(drawer)/_layout.tsx` uses `expo-router/drawer`; `components/shell/DrawerContent.tsx` imports `DrawerContentScrollView` + `DrawerContentComponentProps`, and `components/shell/AppHeader.tsx` imports `DrawerNavigationProp`. The package is missing — **the build breaks here.**
  - The only trace in `package-lock.json` is expo-router's optional peer entry; there is no real install. `react-native-drawer-layout` is missing too.
  - `react-native-gesture-handler` and `react-native-reanimated` are already present, no extra install needed.
- [ ] Pick a version compatible with the current SDK 55 (`npx expo install @react-navigation/drawer`). When upgrading to SDK 57 in Phase 1A, `npx expo install --fix` aligns this one too.

## 0.2 Conflicting route group

- [ ] **Commit** the `app/(tabs)/**` deletions (12 files) in the working tree.
  - In HEAD, `(tabs)` and `(drawer)` exist **together**; both claim the `/`, `/notifications` and `/settings` paths → an expo-router duplicate-route conflict.
  - The `(drawer)` screens are not a copy of `(tabs)` but a rewrite (theme tokens + shell components). No screen is lost — there are one-to-one counterparts.
  - `git grep '(tabs)'` → **zero** references outside `app/(tabs)/`; the deletion breaks nobody.
- [ ] If needed, the deleted files can be read back with `git show HEAD:'app/(tabs)/<file>'`; they are not restored after this phase.

## 0.3 Config consolidation

- [ ] `app.json` is deleted — `app.config.ts` is the single source (AGENTS.md §6 Rule 1: "Don't add `react-navigation` files outside expo-router integration" and the §3 discovery map marks `app.json` as legacy).
- [ ] In `app.config.ts`, the `./assets/images/splash-icon.png` reference becomes `./assets/images/splash.png` in **two places** (the actual file name on disk).
- [ ] `app/(auth)/_layout.tsx` → the `create-tenant` screen is added to the `Stack.Screen` list; the file exists but is not defined in the layout.

## 0.4 Style config cleanup

- [ ] `tailwind.config.js` → the `plugins: [require("daisyui")]` and `daisyui: { themes: [...] }` block is **removed**.
  - daisyui is a **web** (DOM + CSS) plugin; it generates no classes in a NativeWind build. Today it is dead configuration, and it would also collide with Phase 1C's kui-native tokens.
- [ ] `libs/logger.ts` → the unused `import { env }` is removed (dead import; the file already reads `process.env.NODE_ENV`).

## 0.5 Verification

- [ ] `npm install` is clean.
- [ ] `npm run typecheck` has zero errors.
- [ ] `npm run test:ci` existing tests pass.
- [ ] `npx expo start --android` → the app opens, the drawer opens, the three tabs (`/`, `/notifications`, `/settings`) can be navigated.

## Files touched / created

- Changed: `package.json` (+`@react-navigation/drawer`), `package-lock.json`, `app.config.ts` (splash path), `app/(auth)/_layout.tsx` (+`create-tenant`), `tailwind.config.js` (−daisyui), `libs/logger.ts` (−dead import)
- Deleted: `app.json`, `app/(tabs)/**` (12 files)

## Reuse

- `app/(drawer)/**` — the tabs→drawer transition is already complete and committed (`b70a1ba`); it is not rewritten.
- `components/shell/*` — the six components exist on disk and are tracked; they stay as they are until Phase 1C.
- `scripts/auto-snapshot.sh` — a staleness-guarded wrapper around `registry:snapshot`; used for catalog sync.

## Acceptance criteria

- `npm run typecheck` returns **zero** errors.
- The app opens in the emulator and all three paths in the drawer work (today it does not open because of the missing package).
- `app.json` and `app/(tabs)/` **no longer exist** in the repo; `git status` is clean.
- No reference to daisyui remains in `tailwind.config.js`.
- `npm run registry:snapshot` is run; `public/registry/*.json` and `public/components/*.md` are committed (AGENTS.md §0 requirement — the deleted tabs screens must drop out of the catalog).

## Risks

- **`@react-navigation/drawer` version mismatch:** a major that does not match SDK 55 / RN 0.83 can conflict with Reanimated. It must be chosen with `npx expo install`, not by writing a version by hand. The move to SDK 57 is **not made** in this phase (Phase 1A); first a clean baseline is obtained on SDK 55.
- **Deleting `app.json`:** if it contains a field that is not in `app.config.ts` (icon, plugin, scheme), it is silently lost → the two files must be compared field by field **before** deleting.
- **Irreversibility of the tabs deletion:** after the commit, the way back is `git revert`; so the deletion must be a commit **on its own**, not mixed with any other change.
- **Catalog staleness:** if the snapshot is not run, `public/registry/screens.json` still shows the deleted tabs screens and misleads every AI agent.

---

## ✅ CODED — 2026-09-24 (branch `feat/foundation`)

Commits: `b8ba06c` (tabs deletion, on its own) · `46c5a4d` (root layout) · `d045908` (dependencies + lock) · `b9e1be6` (config) · `3c9ca1c` (jest) · `c935547` (tenant DTO) · `0e833a9` (AGENTS.md) · `97a185e` (catalog)

Verification: `npm install` clean (no `--legacy-peer-deps`) · `npx expo install --check` → "up to date" · `npm run typecheck` 0 errors · `npm run test:ci` 2/2 · `npx expo export --platform web` produces all drawer + auth routes.

**Deliberate deviations:**
- **Emulator verification was not done.** Instead, a web export was used to verify that all routes build. Opening the drawer on Android was left to the owner's manual check.
- **The test stack was pulled forward to React 19 from Phase 1A** (RNTL 13, react-test-renderer 19.2.0, `@types/react` 19). `@testing-library/jest-native` and `@types/react-test-renderer` were removed. Reason: with React 19.2, RNTL 12 / react-test-renderer 18 conflicted, so `npm install` did not work at all.
- **`package-lock.json` was regenerated from scratch.** The old lock pinned an `@expo/log-box` version incompatible with expo-router.
- **Missing dependencies were added explicitly:** `babel-preset-expo` (~55.0.25), `babel-plugin-module-resolver`, `react-native-worklets` (0.7.4). These were previously only hoisted transitive packages. `expo-modules-autolinking` was removed as a direct dependency.
- **The Jest harness never worked, fixed:** there were two separate configs, `setupFilesAfterFramework` was a typo and `testPathPattern` was an invalid key. Also, Node export conditions and an ESM transform setting were added for msw, and msw was pinned to `~2.14.6`. Since the repo had no tests, a `__tests__/cn.test.ts` smoke test was added.
- **`CreateTenantRequest` → `z.input`:** a real typecheck error. The caller had to send the `region` field, which has a default value.
- **AGENTS.md** was updated to say `(drawer)` instead of `(tabs)` (it described the deleted group).
- The `app.json` deletion landed in `d045908` (`fix(deps)`) instead of the `fix(config)` commit.
