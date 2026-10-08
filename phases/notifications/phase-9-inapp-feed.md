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
