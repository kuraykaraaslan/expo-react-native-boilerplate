<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/notification_inapp/{module.json,server/*} · modules/account (auth/me/notifications*)
  3. phases/README.md
  4. phases/notifications/README.md (N3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 9 — In-app notification feed

**Goal:** The notification list is accurate and live: an unread badge on the shell, new items appearing without a manual refresh, mark-read and mark-all-read working, and the feed scoped to the active tenant.

Module: `notification_inapp` (routes owned by `account`). Priority 1.

## 9.1 Contract check

- [ ] Compare the current `notification.dto.ts` with the server's notification shape and the list route's pagination / unread-count fields; fix as Phase 3 did.
- [ ] Confirm whether the list is per-tenant (the stream is: channel = `{tenantId, userId}`) and how the switcher should treat it (the badge shows the **active** tenant only).

## 9.2 Live updates

React Native has no `EventSource`; the SSE endpoint holds a connection open with 25 s pings.

- [ ] Preferred: foreground **polling** (`GET` list with unread count every ~30 s while the app is active, paused in background, immediate refetch on `AppState` change and on push receipt). Simple and robust.
- [ ] Optional upgrade: an SSE client over `fetch` streaming or `react-native-sse`, behind the same hook so screens do not change. Only if polling latency is not acceptable.
- [ ] `useNotifications()` hook owns fetch, unread count, optimistic mark-read, and reset on tenant switch.

## 9.3 Screen and shell

- [ ] `app/(drawer)/notifications.tsx`: grouped by day, unread styling, pull-to-refresh, empty state, tap → deep link when the item carries a target.
- [ ] Unread badge on the top bar and drawer item (`components/shell/*`), capped at `99+`.
- [ ] Mark read on open; "Mark all read" action; haptic on success.

## Files touched / created

- Changed: `services/user/notification.{dto,service.client}.ts`, `app/(drawer)/notifications.tsx`, `components/shell/{TopBar,DrawerContent}.tsx`, `locales/*.json`
- New: `libs/useNotifications.ts` (or under `stores/` if it needs shared state)
- Test: unread count, optimistic mark-read rollback, tenant switch resets the feed

## Reuse

- Existing notification service and screen; Phase 8's tap-routing field; `@/components/ui` `Badge`, `EmptyState`, `Spinner`.

## Acceptance criteria

- A notification created on the server appears within the polling interval, and the badge increments.
- Mark-read and mark-all-read update the badge immediately and survive a refresh.
- Switching tenants shows that tenant's feed, not the previous one.
- Backgrounded app issues no polling requests.

## Risks

- **Battery / rate limiting.** Polling too fast trips the limiter; keep the interval configurable and pause in background.
- **Stale badge after tenant switch** if the hook is not keyed on `activeTenantId`.
- **SSE through RN's fetch** is not uniformly supported on Hermes; do not depend on it for correctness.

---

## ✅ CODED — 2026-10-08

Branch `feat/inapp-feed`. Typecheck 0 errors, jest 136/136 (6 new), web export OK.

**Corrections to this plan** (found reading the code and the server, not the plan)
- **Most of 9.3 already existed**: the notifications screen (pull-to-refresh, empty state, mark read, mark all read, clear all, haptics), `notificationStore` and the header bell with a badge. The work was the gaps, not a rebuild.
- **The inbox is not paged and has no unread count.** `GET /auth/me/notifications` returns `{notifications}` — the whole inbox — so the count is derived from the list. The "paginated / unread-count fields" in 9.1 do not exist.
- **The route is `scope: 'ACCOUNT'` but the inbox is per tenant** (the handler passes `{tenantId}` from the URL; the comment says notifications pushed against other tenants are invisible). So the badge and the list follow the **active** tenant.

**What shipped**
- `libs/useUnreadPolling.ts`: the bell's one-time fetch became a foreground poll — on mount, on tenant switch, on resume, then every 60 s; stopped in the background; the count resets to 0 on a switch and an answer that arrives after a switch is dropped; a failed refresh keeps the last count.
- The notifications screen reloads (and clears the old list) when `activeTenantId` changes — the drawer keeps the screen mounted, so before this it kept showing the previous organization's inbox.
- Tapping a notification marks it read and opens its target (`action.url`, else `path`) in the in-app browser. Targets are **web** locations, so relative paths resolve against `EXPO_PUBLIC_FRONTEND_URL`; only http(s) is ever opened (`utils/notification.ts`, tested). Already-read items with a target are tappable too.
- Badge cap is `99+` (was `9+`).

**Deliberate deviations**
- **Polling only**; no SSE. React Native has no `EventSource` and the stream is Redis pub/sub per user; the hook is the one place to swap it in if latency matters.
- **No day grouping** and no deep link into app screens: server targets are web URLs, and there is no web→app route map yet (revisit with Phase 17 search routing).
- The notifications screen still seeds the store from its own list; the poll and the screen agree because both count `!isRead`.

**Not verified:** nothing was run against a live server; polling cadence and resume behavior were not exercised on a device. The 60 s interval is a constant (`UNREAD_POLL_MS`).
