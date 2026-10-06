<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference
  3. phases/README.md (§Locked decisions)
  4. phases/_foundation/README.md
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision beats this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 1C — kui-native git dependency + single design language

**Goal:** Add kui-native to `package.json` as a **git dependency**. Collapse the two competing styling systems (`components/ui/*` with className and `components/shell/*` with inline `style={{}}`) onto the kui-native token system. Application code gets kui-native components only from the `@/components/ui` barrel.

> **Owner decision (fixed, 2026-09-24):** kui-native is **installed as a git package**; its source code is **not copied** into the repo. The earlier "vendor it, don't make it a dependency" decision is cancelled.
> Prerequisite: Phase 1A (SDK 57) and Phase 1B (`v0.2.0` tag) must be complete.

## 1C.1 Dependency

- [x] `package.json` → `"kui-native": "git+https://github.com/kuraykaraaslan/kui-native.git#v0.2.0"`. The version is **always pinned to a tag**, never to a branch (`#main`). `package-lock.json` records the resolved commit SHA.
- [ ] The repo is **public**: the `github:` shorthand resolves over https without credentials. No extra setup is needed for CI and EAS. Verify that `package-lock.json` records the URL as `git+https`, not `git+ssh`; if it stays ssh, a CI environment without an SSH key cannot clone.
- [ ] Optional peers (`expo-video`, `react-native-maps`, `leaflet`, …) are **not installed**. The boilerplate does not use these components.
- [ ] The update procedure is written into `README.md`: new tag in kui-native → change the tag in `package.json` → `npm install` → typecheck + test → separate commit (`chore(deps): kui-native vX.Y.Z`).

## 1C.2 Build integration

- [ ] `tailwind.config.js` → add `"./node_modules/kui-native/modules/ui/**/*.{ts,tsx}"` to `content`. If it is missing, the classes of kui-native components are not generated and the components render **unstyled**.
- [ ] `tailwind.config.js` → `theme.extend.colors = require("kui-native/libs/utils/tailwind-tokens").colors`, `darkMode: "class"`.
- [ ] `jest.config.js` → add `kui-native` to the negative group of `transformIgnorePatterns` (the package ships as uncompiled TS source).
- [ ] `babel.config.js` stays unchanged: `babel-preset-expo` already compiles TS in node_modules. Since no `@/` is left in kui-native after Phase 1B, the `module-resolver` alias does not touch the package.
- [ ] `global.css` → add kui-native's token fallback block under `:root`, writing the `--color-primary*` values as **orange**. This prevents a blue flash on first paint on web. On native, the root `vars()` applies.
- [ ] `metro.config.js` stays unchanged. Verification: render a kui-native component with `npx expo start --clear`.

## 1C.3 Token / theme layer

- [ ] `libs/theme/brand.ts` (new): the boilerplate's brand override. Via `configureTheme({ light: {...}, dark: {...} })`, `primary` = `#f4511e`, and `-hover` / `-active` / `-subtle` / `border-focus` are values computed from the orange. kui-native's blue is **not used**.
- [ ] `configureTheme` is called **once**, in the import chain of `app/_layout.tsx`, before the first render (`import "@/libs/theme/brand"`).
- [ ] `libs/theme/ThemeContext.tsx`: at the root, `themes[useResolvedScheme()]` (kui-native) is applied as `style`. The user's theme preference is kept in MMKV (`zustandStorage`) and fed to kui-native at startup with `useThemeMode.getState().setMode(...)`.
- [ ] `libs/theme/tokens.ts` is **deleted**. All camelCase token usages such as `surfaceBase` are converted to className (`bg-surface-base`), or to `useThemeTokens()["surface-base"]` where a raw hex is needed.
- [ ] `useThemeTokens` is not rewritten in the boilerplate; it is used from `kui-native/libs/theme`.

## 1C.4 UI components: the `@/components/ui` barrel

- [ ] `components/ui/index.ts` (new): explicit named re-exports from kui-native via **deep imports**. Application code does **not import kui-native directly**; it always takes from here.
  ```ts
  export { Button } from "kui-native/modules/ui/Button";
  export type { ButtonProps } from "kui-native/modules/ui/Button";
  ```
  `export *` and the full `kui-native/modules/ui` barrel are **not used** (they pull in the optional peers).
- [ ] Re-exported set: `Button`, `Input`, `TextInput`, `Label`, `Text`, `Card`, `Separator`, `PageHeader`, `ScrollArea`, `Spinner`, `Skeleton`, `SkeletonCard`, `Progress`, `Modal`, `DropdownMenu`, `AlertBanner`, `EmptyState`, `Badge`, `Avatar`, `Select`, `Checkbox`. A component needed in later phases is exposed by adding a single line to this file only.
- [ ] The local `components/ui/{Button,TextInput,LoadingSpinner,SkeletonCard}.tsx` are **deleted**. All call sites (auth screens, drawer screens, shell components) move to `@/components/ui`. Prop differences are fixed at the call site. `Spinner` is used in place of `LoadingSpinner`.
- [ ] If a missing behavior, or one that does not fit the boilerplate, turns up in kui-native, it is **not patched** in the boilerplate. The fix is made in kui-native, a new tag is cut, and a note is left under this phase as `**Deliberate deviations:**`.
- [ ] `KUInative/docs/audits/kui-react-parity/04-api-differences.md` and `06-behavior-differences.md` are read. Known differences for the components in use are noted.

## 1C.5 Converting the shell components

- [ ] `components/shell/{AppHeader,DrawerContent,DrawerNavLink,LangSwitcher,ThemeToggle,UserMenu}.tsx`: `className` + `cn()` instead of inline `style={{}}`, with token classes (`bg-surface-raised`, `text-text-primary`, `border-border`).
- [ ] `ThemeToggle` uses kui-native's `useThemeMode` store (through the MMKV bridge from 1C.3). No second theme store is opened.
- [ ] `LangSwitcher` today offers only `['tr','en']`, yet `libs/i18n.ts` registers six languages (`de,en,es,fr,it,tr`). The list is derived from the `i18n` source.

## 1C.6 Catalog and rules

- [ ] `scripts/build-registry-snapshot.mjs`: reads the kui-native re-exports in `components/ui/index.ts` and writes them to `components.json` as `source: "kui-native"` and `category: "ui"`. The deleted local `ui-*.md` files drop out of the catalog. AI agents keep seeing which components exist from the catalog.
- [ ] `AGENTS.md` is updated:
  - §1: `UI kit: kui-native (git dependency, tag-pinned)`.
  - §2 / §3: `components/ui/` = kui-native re-export barrel.
  - New rule in §6: *"UI primitives come from kui-native via `@/components/ui`. Never copy kui-native source into this repo, never import `kui-native/*` directly from app code. Fix bugs upstream and bump the tag."*
  - In §10: *"Don't pin kui-native to a branch."*
- [ ] The editor rule mirrors are updated in the same change: `.cursor/rules/expo-react-native.mdc`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, `.clinerules`.
- [ ] `npm run registry:snapshot` is run and the generated files are committed.

## Files touched / created

- New: `components/ui/index.ts`, `libs/theme/brand.ts`
- Changed: `package.json`, `package-lock.json`, `tailwind.config.js`, `jest.config.js`, `global.css`, `libs/theme/ThemeContext.tsx`, `components/shell/*` (6 files), `components/auth/{AuthLayout,SSOButtons}.tsx`, all calling `app/**` screens, `scripts/build-registry-snapshot.mjs`, `AGENTS.md` + 5 rule mirrors, `README.md`
- Deleted: `components/ui/{Button,TextInput,LoadingSpinner,SkeletonCard}.tsx`, `libs/theme/tokens.ts`, `public/components/ui-*.md` (the snapshot generates them)

## Reuse

- `kui-native/libs/theme`: `themes`, `useResolvedScheme`, `useThemeMode`, `useThemeTokens`, `configureTheme`. No equivalent is written in the boilerplate.
- `kui-native/libs/utils/tailwind-tokens`: the single source of the tailwind color map.
- `utils/cn.ts`: identical to kui-native's `cn`. The boilerplate keeps using its own `cn` (AGENTS.md §6 Rule 3).
- `libs/zustandStorage.ts`: persistence of the theme preference.
- `libs/i18n.ts`: the single source of the supported language list.

## Acceptance criteria

- In `package.json`, `kui-native` is pinned to a **tag**; the repo contains **no** copy of kui-native source code.
- `git grep -n "kui-native/" -- app components/shell components/auth` → **zero** (the app uses only `@/components/ui`).
- `git grep LoadingSpinner` and `git grep "libs/theme/tokens"` → zero.
- Nowhere under `components/` that accepts className is a raw hex or a `style={{}}` color left. The only exceptions are `placeholderTextColor`, `trackColor`, FontAwesome `color` and the modal backdrop.
- Light and dark themes render correctly in **all** of the drawer, auth and settings screens. A theme change is reflected immediately, and the preference is kept when the app is reopened. `primary` is orange.
- `npm run typecheck` and `npm run test:ci` are green. `LangSwitcher` lists the six languages.
- After `npm run registry:snapshot`, the MCP `list_components` returns the kui-native components with `source: "kui-native"`.

## Risks

- **Missing Tailwind `content` entry:** the quietest failure. The component renders but has no classes. `Button` is checked by eye during the first integration.
- **Double React:** if the peer layout was left incomplete in Phase 1B, you get `Invalid hook call`. `npm ls react` must show a single version.
- **Pressure to fix outside a tag:** for an urgent bug, editing `node_modules/kui-native` by hand or using `patch-package` is **forbidden**. The fix is made in kui-native and a patch tag (`v0.2.1`) is cut.
- **Brand color drift:** if the `configureTheme` call happens after the first render, the first frame shows blue. The `brand.ts` import must be at the **very top** of `app/_layout.tsx`.
- **ssh URL in the lock file:** if `git+ssh://` gets written into the lock because of a local git setting (`url.<ssh>.insteadOf`), CI/EAS cannot clone. Check the lock before committing it.
- **Missed call sites:** after the local components are deleted, typecheck catches every missing import. Prop **semantics** differences (e.g. `variant` names), however, only show up by walking through the screens.

---

## ✅ CODED — 2026-09-24

Commits: `c854767` (dependency + build integration) · `ff2e1e1` (theme + components + shell) · `d0c18bc` (catalog) · `893158c` (AGENTS.md, 5 rule mirrors, README)

Verification: `npm run typecheck` 0 errors (kui-native sources compile together with the boilerplate's strict settings) · `npm run test:ci` 2/2 · `npx expo export --platform web` succeeded. The root of the generated HTML contains `--color-primary:#f4511e`; only the classes used by kui-native (`min-w-[10rem]`, `border-error`, `shadow-lg`) made it into the CSS, which means the tailwind `content` path works. With SSH disabled and a clean cache, `npm ci` installs kui-native without trouble. `git grep "kui-native/" -- app components` shows only `components/ui/index.ts`. The MCP catalog lists 20 components with `source: "kui-native"`.

**Deliberate deviations:**
- **The dependency is written as `git+https://github.com/kuraykaraaslan/kui-native.git#v0.2.0`** (explicit https instead of the `github:` shorthand). With either spelling, npm writes `git+ssh://…#887ad72` to the lock. This is not a blocker: for a public repo npm falls back to the https tarball (verified with an SSH-disabled `npm ci`).
- **`useThemeTokens`** is re-exported from `@/libs/theme/ThemeContext`. Per the rule, application code does not import `kui-native/*`; only `components/ui/index.ts` and `libs/theme/*` may.
- **The theme preference bridge is at module level,** not in an effect. Since MMKV hydrates synchronously, the correct scheme is there on the first frame.
- **`useTheme()` no longer returns `tokens`;** it returns only `isDark`, `colorScheme` and `setColorScheme`. `useThemeTokens()` is used for raw colors.
- **`LangSwitcher`** shows the six languages with kui-native `DropdownMenu` instead of listing them inline (no room in the header). The list is derived from `SUPPORTED_LOCALES` (`libs/i18n.ts`).
- **The local `Button` and `TextInput` were not used anywhere,** so they were deleted without any call-site fix. `LoadingSpinner` was replaced with `Spinner size="lg"` in 6 screens.
- **`app/**` screens still use raw Tailwind color classes** (`bg-white dark:bg-gray-900`, `text-orange-500`) and hex for FontAwesome `color`. The acceptance criterion is met for `components/`. Moving the screens to tokens will happen with Phase 4 (auth) and Phase 5 (tenancy), which rewrite the screens anyway; this work also stays open for the drawer home page, notifications and settings screens.
- **No emulator verification was done;** a web export was used instead. The light/dark switch and the preference surviving a reopen must be checked by hand on a device.
