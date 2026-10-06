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

# _foundation — build, design language and transport (Phase Plan index)

> **This is not a module set.** All of the phases are cross-cutting: they make the repo buildable,
> align the SDK with kui-native, wire kui-native in as a git package and bring the two competing styling systems down to
> a single design language, and move the entire network layer to the device-bearer contract. **All** of the `auth`, `tenant` and `auth_sso` sets sit on top of this set.

## Why (context)

- The repo **does not build** today: `app/(drawer)/_layout.tsx` and `components/shell/{AppHeader,DrawerContent}.tsx` import `@react-navigation/drawer`, but the package is missing from `package.json`.
- HEAD contains both `app/(tabs)/**` and `app/(drawer)/**` — for expo-router, a conflicting route group on the `/`, `/notifications` and `/settings` paths. The deletions in the working tree are exactly this cleanup, not yet committed.
- `components/ui/*` uses NativeWind `className` + `cn()`, `components/shell/*` uses inline `style={{}}` + `libs/theme/tokens.ts`. Two design systems in the same repo.
- `libs/axios.ts` imitates a cookie-based web flow; it has nothing to do with the server's device surface.

## Order

| Phase | File | Topic | Priority |
|-----|-------|------|---------|
| 0 | [phase-0-build-fix.md](phase-0-build-fix.md) | Get the build working | ✅ `97a185e` |
| 1A | [phase-1a-expo-sdk-57.md](phase-1a-expo-sdk-57.md) | Expo SDK 55 → 57 | ✅ `365b597` |
| 1B | [phase-1b-kui-native-package.md](phase-1b-kui-native-package.md) | kui-native packaging (**in the KUInative repo**) + `v0.2.0` tag | ✅ KUInative `887ad72` · `v0.2.0` |
| 1C | [phase-1c-kui-native-dependency.md](phase-1c-kui-native-dependency.md) | kui-native git dependency + single design language | ✅ `ff2e1e1` |
| 1D | [phase-1d-design-parity.md](phase-1d-design-parity.md) | next-boilerplate visual parity (color, font, all screens) | ✅ `717be69` · kui-native `v0.3.1` |
| 2 | [phase-2-transport.md](phase-2-transport.md) | Transport layer (device bearer) | ✅ `feat/transport` |

## Locked decisions

- **Phase 0 first.** In a repo that does not build, neither the style unification nor the transport tests can be verified.
- **kui-native is installed as a git package, not copied** (owner decision, 2026-09-24; supersedes the earlier vendor decision). The version is pinned to a **tag**.
- **Expo SDK is upgraded to 57** (Phase 1A). kui-native is on SDK 57 / RN 0.86; react / RN / expo must remain a single copy.
- **Packaging is done upstream** (Phase 1B, KUInative repo). `@/` imports become relative, runtime packages move to peerDependencies, a brand override is added with `configureTheme`. No alias tricks or `node_modules` patches in the boilerplate.
- **The single styling system is NativeWind.** Inline `style={{}}` remains only for RN props that do not accept className (`placeholderTextColor`, `trackColor`, FontAwesome `color`, modal backdrop).
- **The cookie logic is deleted entirely** — no half-measures. Mixing bearer and cookie flips the server's audience selection (`cookieAccessToken ? 'web' : 'device'`) to the wrong side.

## Dependency graph (summary)

- Phase 1A depends on Phase 0's buildable repo. The upgrade is made as a separate commit **after** the Phase 0 commit.
- Phase 1B depends on no other phase (KUInative repo). It can start in parallel with Phase 0.
- Phase 1C depends on Phase 1A (same SDK), Phase 1B's tag and Phase 0's `tailwind.config.js` cleanup (until daisyui is removed, the tokens collide).
- Phase 2 depends on Phase 1A. It is independent of Phase 1B/1C and can run in parallel.
- The `auth` set (Phases 3–4) depends on Phase 2's interceptor prefix, the `tenant` set (Phase 5) on Phase 2's per-tenant SecureStore keys.

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
