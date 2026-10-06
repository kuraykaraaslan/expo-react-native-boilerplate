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

# Phase 1A — Expo SDK 57 upgrade

**Goal:** Move the boilerplate to the **same** Expo SDK as kui-native (57 / RN 0.86 / React 19.2.3). That way, when kui-native is installed as a git dependency, `react`, `react-native`, `expo`, `nativewind` and `reanimated` remain a **single copy**.

> **Owner decision (fixed, 2026-09-24):** The boilerplate is upgraded to SDK 57. The earlier "no SDK upgrade" decision was **removed** together with the vendor approach.

## 1A.1 Core upgrade

- [ ] `npx expo install expo@^57.0.0` → then `npx expo install --fix` (all `expo-*` and RN packages are aligned to SDK 57's `bundledNativeModules` versions).
- [ ] Versions written as `*` are pinned: `expo-font`, `expo-image`, `expo-modules-autolinking`, `jest-expo`. A `*` version does not guarantee SDK compatibility.
- [ ] Target versions must be **the same as kui-native's `package.json`**: `react` / `react-dom` `19.2.3`, `react-native` `0.86.x`, `react-native-reanimated` `4.5.x`, `react-native-gesture-handler` `~2.32`, `react-native-safe-area-context` `~5.7`, `react-native-screens` `~4.26`, `react-native-svg` `15.15.x`.

## 1A.2 Aligning shared dependencies with kui-native

- [ ] FontAwesome 6 → 7: `@fortawesome/{fontawesome-svg-core,free-solid-svg-icons,free-brands-svg-icons}` `^7.3.1`, `@fortawesome/react-native-fontawesome` `^1.0.0`. kui-native components are built with FA 7 icon objects; two majors cannot remain in the same tree.
- [ ] `react-native-svg` is added to `dependencies` **explicitly** (today it is only transitive; kui-native requires it as a peer).
- [x] ~~Removing `@types/react` 19, `@types/react-test-renderer` and `@testing-library/jest-native`~~ → done in Phase 0 (`d045908`).
- [ ] `react-test-renderer` `19.2.0` → `19.2.3` (exactly matching react). `@testing-library/react-native` `^13` → `^14` (kui-native's tests are written against the v14 API).
- [ ] `@expo/vector-icons` dependency: `git grep "@expo/vector-icons"` → remove if there is no usage (AGENTS.md §6 Rule 10).

## 1A.3 Breaking-change scan

- [ ] The breaking changes in the Expo SDK 56 and 57 changelogs are checked one by one: `expo-router` (layout API, `Stack.Screen` / `Drawer` props), `expo-secure-store`, `expo-splash-screen`, `expo-web-browser`, `expo-system-ui`.
- [ ] `react-native-mmkv` v3 → verify RN 0.86 / New Architecture compatibility. If incompatible, upgrade the MMKV version; if the `libs/mmkv.ts` API changes, update `libs/zustandStorage.ts` along with it.
- [ ] `sonner-native`, `react-native-webview`, `@react-native-picker/picker`, `@react-native-community/netinfo` → pulled to the SDK 57 versions with `npx expo install`.
- [ ] `npx expo-doctor` zero warnings.

## 1A.4 Verification

- [ ] `npm install` is clean (`--legacy-peer-deps` **must not be needed**; if it is, the cause is found and fixed).
- [ ] `npm run typecheck` zero errors.
- [ ] `npm run test:ci` passes.
- [ ] `npx expo start --android` → Phase 0's acceptance criteria (drawer + three paths) are met on SDK 57 too.
- [ ] `npm ls react react-native expo nativewind` → each has a **single** version.

## Files touched / created

- Changed: `package.json`, `package-lock.json`; if needed after the breaking-change scan, `app/**/_layout.tsx`, `libs/mmkv.ts`, `libs/zustandStorage.ts`, files that import FontAwesome icons.

## Reuse

- `KUInative/package.json` — the only reference for the target versions. No guessing in version selection; read them from there.
- `KUInative/README.md` §Run — the `ERESOLVE` note encountered during the SDK 57 install.

## Acceptance criteria

- In `package.json`: `expo` `^57`, `react-native` `0.86.x`, `react` `19.2.3`.
- `npx expo-doctor` is clean, `npm ls react` shows a single version.
- Typecheck, tests and emulator verification are green at Phase 0's level.
- Since no screen / component changes in the catalog, a snapshot is not mandatory; still, `npm run registry:snapshot` is run and it is verified that **no diff** appears.

## Risks

- **Two majors at once (55 → 57):** SDK 56's breaking changes could be skipped. The changelogs for 56 and 57 must be read **separately**.
- **MMKV / New Architecture:** if the persisted stores cannot be read, the session and preferences are lost. Test with the same account in the emulator before and after the upgrade.
- **FontAwesome 7 icon names:** some icons were renamed in FA 7. `typecheck` catches import errors; any remaining icons are replaced one by one.
- **Mixing with Phase 0:** the upgrade is made as separate commit(s) **after** Phase 0 is committed. That way, whether a regression belongs to the SDK upgrade or to Phase 0 can be told apart.

---

## ✅ CODED — 2026-09-24

Commits: `365b597` (SDK 57 + alignment) · `87d7adb` (catalog: only the timestamp and the shell import path)

Verification: `npx expo install --check` → up to date · `npx expo-doctor` 21/21 · `npm run typecheck` 0 errors · `npm run test:ci` 2/2 · `npx expo export --platform web` successful · `npm ls` → react 19.2.3 / react-native 0.86.3 / expo 57.0.25 / nativewind 4.2.7 single copy.

**Deliberate deviations:**
- **`@react-navigation/drawer` and `@react-navigation/native` were removed.** expo-router 57 exports the drawer and its types itself (`expo-router/drawer`). The separate package's types conflicted with its own (TS2322). The shell components now import from `expo-router/drawer`.
- **`react-i18next` 15 → 17.** v15 did not accept TypeScript 6 as a peer.
- **TypeScript 6** (the `~6.0.3` that SDK 57 expects): `@types` is no longer loaded automatically → `"types": ["jest"]` was added to `tsconfig.json` (as in kui-native).
- **The top-level `splash` field in `app.config.ts` was removed.** SDK 57's `ExpoConfig` type has no such field. The `expo-splash-screen` plugin manages the splash.
- **The only remaining peer warning:** RNTL 14 → `test-renderer` → `react-reconciler@0.34` wants `react@^19.3`. kui-native has the same warning and the tests pass; `--legacy-peer-deps` is not needed.
- **Emulator verification and the on-device MMKV persistence test were not done** (left to the owner). The SDK 56/57 changelogs were not read line by line; breakages were caught by typecheck, export and expo-doctor.
