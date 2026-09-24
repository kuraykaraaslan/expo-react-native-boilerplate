# AGENTS.md — AI Agent Orientation Guide

> **Read this first.** This file is the AI-readable map of the entire project: what lives where, what the rules are, and which file to open for any given task. It is the canonical entry point for any AI coding assistant (Claude Code, Cursor, Copilot, Aider, OpenCode, etc.) working in this repo.

## 0. Machine-readable catalog + MCP server

Before grepping or guessing — fetch the catalog. Static snapshots live under `public/` (rebuild with `npm run registry:snapshot`):

| Surface | Path | What's in it |
|---|---|---|
| Full registry | [`public/registry/registry.json`](public/registry/registry.json) | Screens + components + services + stores + DTOs + libs + conventions |
| Slim index | [`public/registry/registry.index.json`](public/registry/registry.index.json) | Same shape, slimmer (no inlined source) |
| Screens | [`public/registry/screens.json`](public/registry/screens.json) | Every Expo Router screen with route, layout chain, group |
| Components | [`public/registry/components.json`](public/registry/components.json) | Every UI component with category, exports |
| Services | [`public/registry/services.json`](public/registry/services.json) | `*.service.client.ts` files with exported class/methods |
| Stores | [`public/registry/stores.json`](public/registry/stores.json) | Zustand stores with state shape hints |
| DTOs | [`public/registry/dtos.json`](public/registry/dtos.json) | Zod schemas in `dto/` |
| Libs | [`public/registry/libs.json`](public/registry/libs.json) | `libs/` utilities (axios, env, i18n, logger, mmkv, secureStorage, zustandStorage) |
| Per-component | `public/components/<id>.md` | One markdown per UI component |
| Component index | [`public/components/_index.json`](public/components/_index.json) | `{ id → { category, file } }` |
| Schema | [`public/schemas/registry-v1.json`](public/schemas/registry-v1.json) | JSON Schema for the registry shape |
| llms.txt | [`public/llms.txt`](public/llms.txt) | llms.txt-convention summary |

**MCP server** in [`.mcp.json`](.mcp.json) (script: [`scripts/mcp-server.mjs`](scripts/mcp-server.mjs)). Tools: `list_screens`, `get_screen`, `search_screens`, `list_components`, `get_component`, `search_components`, `list_services`, `list_stores`, `list_dtos`, `list_libs`, `get_conventions`, `read_file`. Zero-dependency, stdio JSON-RPC, works with Claude Desktop / Cursor / Cline / Windsurf / Zed.

**Editor-native rule mirrors** of this file: [`.cursor/rules/expo-react-native.mdc`](.cursor/rules/expo-react-native.mdc), [`.cursorrules`](.cursorrules), [`.windsurfrules`](.windsurfrules), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`.clinerules`](.clinerules).

> ⚠️ **Keep the catalog in sync (REQUIRED).** Any time you **add, rename, or remove** a screen (`app/`), component (`components/`), service (`services/`), store (`stores/`), DTO (`dto/`), or lib (`libs/`), you **must** rebuild the catalog before committing:
>
> ```bash
> npm run registry:snapshot
> ```
>
> This regenerates `public/registry/*.json` and `public/components/*.md` from filesystem state. The script also runs automatically via the `prebuild` npm hook before `npm run build`, but commit the regenerated files so the catalog stays in lockstep with the code. A stale catalog is worse than no catalog — it misleads every AI agent that reads it.

## 1. What this project is

A **production-grade Expo + React Native boilerplate** for cross-platform mobile (iOS, Android, Web) with multi-tenant SaaS conventions matching the sister project [next-boilerplate](https://github.com/kuraykaraaslan/next-boilerplate).

- **Framework**: Expo SDK 55 · React Native · TypeScript 5 (strict)
- **Routing**: Expo Router v5 — file-based, with route groups `(auth)` / `(drawer)`
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State**: Zustand 5 + MMKV (never AsyncStorage)
- **Tokens**: `expo-secure-store` only — tokens NEVER live in Zustand
- **Data fetch**: `axiosInstance` from `libs/axios.ts` (auth header injected by interceptor from SecureStore)
- **Validation**: Zod (DTOs in `dto/`)
- **i18n**: i18next via `libs/i18n.ts`
- **UI kit**: [kui-native](https://github.com/kuraykaraaslan/kui-native) — git dependency pinned to a tag, re-exported from `@/components/ui`; semantic tokens (`bg-primary`, `text-text-primary`, `border-border`), brand override in `libs/theme/brand.ts`
- **Icons**: FontAwesome 7 via `@fortawesome/react-native-fontawesome`
- **Testing**: Jest + `jest-expo`

See [MODERNIZATION.MD](MODERNIZATION.MD) for the modernization plan / current-vs-target table.

## 2. Architecture

```
app/  (screens)  ──→  services/ + stores/  ──→  libs/axios + libs/secureStorage
              \                            /
               └──→  components/  ←──── utils/cn
                          ↑
                       dto/ (Zod, shared with server)
```

- **`app/`** — Expo Router file-based screens. Each `.tsx` is a route. `_layout.tsx` defines layouts (Stack / Tabs / Slot). `(group)` directories are route groups stripped from URLs. `+not-found.tsx` is the 404. `+html.tsx` customizes the web HTML shell.
- **`components/<category>/<Component>.tsx`** — reusable UI. Currently: `auth/` (AuthLayout, SSOButtons), `shell/` (AppHeader, DrawerContent, …), `ui/` (`index.ts` — kui-native re-export barrel: Button, Input, Card, Spinner, …).
- **`services/<name>.service.client.ts`** — data-fetching layer. Currently service classes with static methods (`AuthClientService.login(...)`). Target per [MODERNIZATION.MD](MODERNIZATION.MD): hook pipeline (`useAuth` → `axiosInstance`).
- **`stores/<name>Store.ts`** — Zustand stores, persisted via MMKV (`zustandStorage`). E.g. `useAuthStore`, `useTenantStore`, `useAppStore`.
- **`dto/<name>.dto.ts`** — Zod schemas + inferred types. Shared contracts with the backend.
- **`libs/<name>.ts`** — primitives: `axios.ts`, `env.ts` (Zod-validated env), `i18n.ts`, `logger.ts`, `mmkv.ts`, `secureStorage.ts`, `zustandStorage.ts`.
- **`utils/cn.ts`** — `cn()` className helper (clsx + tailwind-merge analogue).

## 3. Top-level discovery map

```
.
├── AGENTS.md                 ← you are here
├── README.md                 ← human-facing intro
├── MODERNIZATION.MD          ← current-vs-target architecture plan
├── app.config.ts             ← Expo app config (TypeScript)
├── app.json                  ← legacy Expo config
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json             ← path alias: @/* → ./*
├── jest.config.js
├── global.css                ← Tailwind entry
├── expo-env.d.ts             ← Expo ambient types
├── nativewind-env.d.ts       ← NativeWind ambient types
│
├── app/                      ← Expo Router screens
│   ├── _layout.tsx           ← root layout (Slot + providers + session restore)
│   ├── +html.tsx             ← web HTML shell
│   ├── +not-found.tsx        ← 404
│   ├── (auth)/               ← auth route group (login, register, 2fa, …)
│   └── (drawer)/             ← side drawer (home, notifications, settings/)
│
├── components/               ← shared UI (NativeWind + FontAwesome)
│   ├── auth/                 ← AuthLayout, SSOButtons
│   └── ui/index.ts           ← kui-native re-exports (Button, Input, Card, Spinner, …)
│
├── services/                 ← *.service.client.ts (data fetching via axiosInstance)
├── stores/                   ← Zustand stores (MMKV-persisted)
├── dto/                      ← Zod schemas + types (shared contract with server)
├── libs/                     ← primitives (axios, env, i18n, logger, mmkv, secureStorage, zustandStorage)
├── utils/                    ← cn() and other helpers
├── config/                   ← runtime config
├── constants/                ← compile-time constants
├── locales/                  ← i18n message catalogs
├── static/                   ← logo, screenshots, design assets
├── assets/                   ← Expo asset bundle (fonts, icons, splash)
├── __mocks__/                ← Jest mocks
├── __tests__/                ← Jest tests
└── public/                   ← AI catalog (registry + llms.txt + schemas)
```

## 4. Path alias

There is **one** alias configured in [tsconfig.json](tsconfig.json):

```
"@/*": ["./*"]
```

Examples:

```ts
import { useAuthStore } from "@/stores/authStore";
import { AuthClientService } from "@/services/auth.service.client";
import { LoginRequest } from "@/dto/auth.dto";
import { Button, Spinner } from "@/components/ui";
import { cn } from "@/utils/cn";
import axiosInstance from "@/libs/axios";
import { getToken } from "@/libs/secureStorage";
```

## 5. File-naming convention

| Suffix / pattern | Role |
|---|---|
| `app/<route>.tsx` | Expo Router screen — default export is the component |
| `app/**/_layout.tsx` | Expo Router layout — wraps child routes (Stack / Tabs / Slot) |
| `app/**/+not-found.tsx` | 404 / catch-all |
| `app/+html.tsx` | Web-only HTML shell |
| `components/<category>/<Component>.tsx` | Reusable UI; PascalCase, named export preferred |
| `services/<name>.service.client.ts` | Data-fetching service (class with static methods today; hook pipeline tomorrow) |
| `stores/<name>Store.ts` | Zustand store; export name `use<Name>Store` |
| `dto/<name>.dto.ts` | Zod schemas + inferred TS types |
| `libs/<name>.ts` | Primitives (axios, env, mmkv, etc.) |
| `utils/<name>.ts` | Pure helpers |
| `__tests__/<name>.test.ts(x)` | Jest tests |

## 6. Hard rules

1. **Expo Router file-based routing.** Don't add `react-navigation` Stack/Drawer files outside of `expo-router` integration. Routes are defined by the filesystem.
2. **Path alias only `@/*`.** No `~/`, no `src/`. Imports from anywhere use `@/...`.
3. **NativeWind for styling.** Use `className` with Tailwind tokens. Combine classes with `cn()` from `@/utils/cn`. No `StyleSheet.create({...})` for new code unless dynamic styling demands it.
4. **State = Zustand + MMKV.** Use the `zustandStorage` from `@/libs/zustandStorage` when persistence is required. **Never** `AsyncStorage` (mandate from `Code_Structure_Rules_ReactNative`).
5. **Tokens live in SecureStore — NEVER Zustand.** Use `getToken`/`setToken` from `@/libs/secureStorage` for `accessToken`/`refreshToken`. The axios interceptor injects them.
6. **All data fetching via `axiosInstance` from `@/libs/axios`.** Never call `fetch` directly. Don't construct ad-hoc axios instances. The shared instance handles base URL, cookies, and auth header injection.
7. **DTOs are Zod-validated contracts.** Parse responses with the DTO schema (`SafeUserSchema.parse(res.data)`); never trust raw JSON.
8. **Env access through `@/libs/env`.** Zod-validated. Never read `process.env.*` directly in app code.
9. **Logging via `@/libs/logger`.** Never `console.*` in app code.
10. **Icons: FontAwesome only.** `@fortawesome/react-native-fontawesome` + `@fortawesome/free-solid-svg-icons` / `free-brands-svg-icons`. No `expo/vector-icons` for new code unless an icon truly doesn't exist in FontAwesome.
11. **Haptic feedback on auth + critical actions.** `expo-haptics` — `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success | Error)`.
12. **Toasts via `sonner-native`.** `toast.success/error/info`. Don't roll your own.
13. **UI primitives come from kui-native via `@/components/ui`.** kui-native is a tag-pinned git dependency (`package.json`). Never copy its source into this repo and never import `kui-native/*` from app code — only `components/ui/index.ts` and `libs/theme/*` may. Need another component? Add a deep re-export line to `components/ui/index.ts`. Found a bug? Fix it upstream, tag a release, bump the tag here. Raw token hex (for props without `className`): `useThemeTokens()` from `@/libs/theme/ThemeContext`.

## 7. Routing: how Expo Router builds the URL tree

- A file `app/(auth)/login.tsx` → route `/login` (the `(auth)` group is stripped).
- A file `app/(drawer)/settings/profile.tsx` → route `/settings/profile` (the `(drawer)` group is a layout wrapper, not a URL segment).
- `app/_layout.tsx` wraps everything (currently `<Slot />` + providers + session restore).
- `app/(drawer)/_layout.tsx` defines the side drawer (`expo-router/drawer`).
- `app/(auth)/_layout.tsx` defines the auth stack.
- Navigate with `router.push("/select-tenant")` / `router.replace(...)` from `expo-router`.
- Use `<Link href="/...">` for declarative navigation.

## 8. Where to find things — quick index

| I need to… | Open |
|---|---|
| understand the overall architecture | this file + [README.md](README.md) |
| see the modernization plan (current vs target) | [MODERNIZATION.MD](MODERNIZATION.MD) |
| add a new screen | `app/<route>.tsx` (or under an existing `(group)`) |
| add a new component | `components/<category>/<Component>.tsx` |
| add a new data fetcher | `services/<name>.service.client.ts` + DTO in `dto/<name>.dto.ts` |
| add a new persistent client state | `stores/<name>Store.ts` (use `zustandStorage`) |
| add a new DTO / schema | `dto/<name>.dto.ts` (Zod) |
| add a new primitive (axios interceptor, env key, etc.) | `libs/<name>.ts` |
| add a new translation key | `locales/<lang>/<namespace>.json` |
| configure Expo (icons, splash, plugins) | [app.config.ts](app.config.ts) |
| change Tailwind theme | [tailwind.config.js](tailwind.config.js) |
| change runtime config | [config/](config/) |

## 9. How to add a new screen

1. Create `app/<route>.tsx` (or `app/(group)/<route>.tsx` to put it under an existing layout/group).
2. Default-export a component (this is the screen).
3. If it needs custom navigation chrome, add a sibling `_layout.tsx`.
4. Wire the data path: import the relevant `services/*.service.client.ts` and the matching `stores/*Store.ts`.
5. If it needs new DTOs, add them to `dto/<x>.dto.ts`.
6. Add tests under `__tests__/`.
7. **Rebuild the AI catalog: `npm run registry:snapshot`**.

## 10. Don't

- Don't import `AsyncStorage` from anywhere — use `@/libs/mmkv` or `@/libs/zustandStorage` for persistence.
- Don't store tokens in Zustand — only SecureStore via `@/libs/secureStorage`.
- Don't call `fetch` or construct ad-hoc axios instances — use `@/libs/axios`.
- Don't read `process.env.*` directly — use `@/libs/env`.
- Don't use `console.*` in app code — use `@/libs/logger`.
- Don't add new path aliases — `@/* → ./*` is the only one.
- Don't add React Navigation `createStackNavigator` / `createDrawerNavigator` — Expo Router handles routing.
- Don't put navigation chrome (headers, tabs) directly in screens — use `_layout.tsx`.
- Don't bypass NativeWind — no raw hex / rgb in `style={{}}` unless dynamically computed.
- Don't add other icon libraries (`lucide-react`, `heroicons`, etc.) — FontAwesome only.
- Don't pin kui-native to a branch (`#main`), patch `node_modules/kui-native`, or use `patch-package` on it — release a new tag instead.
