<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/notification/ · modules/notification_push/ · modules/notification_inapp/ · modules/account (auth/me/notifications)
  3. phases/README.md
  4. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# notifications — push registration and the in-app feed (Phase Plan index)

## Why (context)

The client has a notifications screen that lists `GET /auth/me/notifications` and marks items read. Two things are missing:

1. **No push.** `notification_push` on the server is **Web Push (VAPID) only**: `POST /api/notifications/push/subscribe` takes `{endpoint, keys: {p256dh, auth}}`. A native device has an Expo/FCM/APNs token, not a Web Push subscription. The module does expose a `push:provider` extension point (Web Push, FCM, Expo, …), so the fix is server-side — same class of blocker as K4.
2. **No live feed or unread badge.** `notification_inapp` exposes an SSE stream (`GET /auth/me/notifications/stream`, Redis pub/sub per `{tenantId, userId}`). React Native has no `EventSource`.

## Order

| Phase | File | Topic | Priority |
|-----|-------|------|---------|
| 8 | [phase-8-push.md](phase-8-push.md) | Push registration (**needs a server change**) | ⬜ Pending |
| 9 | [phase-9-inapp-feed.md](phase-9-inapp-feed.md) | In-app feed, unread badge, preferences | ✅ Coded 2026-10-08 |

## Locked decisions

- **N1 — Push token transport is decided on the server first.** The client does not fake a Web Push subscription. Phase 8 does not start coding until the owner picks the server option in phase-8 §8.1.
- **N2 — Per-tenant registration.** The server keys push by `(tenantId, endpoint)`, so the device registers once **per tenant it holds a token pair for** (K2) and unregisters all of them on `logout`/`flush()`.
- **N3 — Phase 9 does not depend on Phase 8.** The feed and badge work with polling even if push never ships.

## Dependency graph (summary)

- Phase 8 depends on a server change and on Phase 2 (per-tenant tokens) / Phase 5 (`knownTenantIds` cleanup).
- Phase 9 depends on Phase 2 only; it reuses the existing notification service and screen.

## Format of every phase file

`Goal` · `Tasks (checkbox)` · `Files touched / created` · `Reuse` · `Acceptance criteria` · `Risks`.
