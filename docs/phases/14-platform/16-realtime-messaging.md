<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/websocket · modules/messaging/{module.json,server/messaging.ticket.service.ts,server/*}
  3. docs/phases/README.md (§Locked decisions K2)
  4. docs/phases/14-platform/README.md (P1, P3)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: docs/phases/README.md §Order
-->

# Phase 16 — Realtime transport and messaging

**Goal:** A user can open conversations, read and send messages in real time, see unread counts, and the connection survives backgrounding and tenant switches.

Modules: `websocket`, `messaging`. Priority 2. Largest phase of the set; split into two commits (16A transport, 16B UI) if needed.

## 16.1 Contract check

- [ ] `POST /messaging/ws-ticket` mints a short-lived, single-use ticket presented on the Socket.IO handshake, authenticated by the normal tenant session. Read the ticket service for TTL, the handshake field name, the **namespace** (one per domain) and the event names; record them here.
- [ ] Confirm the gateway URL (a standalone process, probably not the API origin) and add it to `libs/env` (`EXPO_PUBLIC_WS_URL`), validated like the other env vars.
- [ ] REST: `GET/POST /conversations`, `GET /conversations/unread-count`, `GET/POST /conversations/[id]/messages`, `POST …/read`, `…/participants`, `POST …/messages/[messageId]/report`.

## 16.2 Transport

- [ ] Add `socket.io-client`. `libs/realtime.ts`: connect with a **fresh ticket per (re)connect** (tickets are single use), per active tenant; disconnect and reconnect on tenant switch; disconnect on logout/`flush()`.
- [ ] Lifecycle: connect on foreground, close shortly after background (iOS suspends sockets), exponential backoff with jitter, ticket refetch on every attempt; a 401/403 from the ticket call goes through the Phase 2 session-end path.
- [ ] Event bus into stores (messages, typing, presence, read cursors); no screen talks to the socket directly.

## 16.3 UI

- [ ] `app/(drawer)/messages/index.tsx` conversation list (last message, unread badge, search), `messages/[conversationId].tsx` thread (inverted list, optimistic send with failure/retry, typing indicator, read receipts, report/delete), new-conversation picker from tenant members (needs Phase 7).
- [ ] Unread count in the drawer from `GET /conversations/unread-count`, kept live by events; reuse Phase 9's badge component.
- [ ] Offline: queue unsent messages in MMKV and flush on reconnect, with de-duplication using a client message id (verify the server supports an idempotency key; the `redis_idempotency` module exists).
- [ ] Push for new messages routes through Phase 8 when it has shipped; until then the badge updates only while the app is open.

## Files touched / created

- New: `libs/realtime.ts`, `services/platform/messaging.*`, `stores/messagingStore.ts`, `app/(drawer)/messages/*`
- Changed: `libs/env.ts`, drawer layout, `locales/*.json`, `package.json`
- Test: reconnect with a new ticket, tenant switch tears down and reconnects, optimistic send rollback, queue flush de-duplication

## Reuse

- Phase 2 tokens and error path; Phase 5 switch hooks; Phase 7 member list; Phase 9 badge; Phase 15 attachments (later).

## Acceptance criteria

- Two devices in the same conversation see each other's messages within a second.
- Backgrounding for a minute and returning reconnects and backfills missed messages from REST.
- Switching tenants shows only that tenant's conversations; no events from the old tenant arrive.
- Signing out closes the socket.
- `npm run registry:snapshot` is up to date.

## Risks

- **Reused tickets** cause silent auth failures on reconnect; mint per attempt.
- **Event/REST ordering** produces duplicates or gaps; reconcile by message id and cursor.
- **Cross-tenant leakage** if the socket is not torn down on switch.
- **Moderation and reports** are server policy; the app only submits reports and renders the server's removed-message state.

---

## 🟡 CODED — 2026-10-09

**Contract check (server source):**
- `POST /messaging/ws-ticket` (permission `messaging.ws_ticket.create`) → 201 `{ticket, expiresIn: 30, wsUrl, path: "/messaging"}`; connect to `${wsUrl}${path}` with `auth: {ticket}`. The ticket is consumed atomically (`GETDEL`), so it is single use. **`wsUrl` comes from the server** (`WS_PUBLIC_URL`; null when unconfigured), so no `EXPO_PUBLIC_WS_URL` was added to `libs/env` (deviation from 16.1). A refused handshake errors with `unauthorized` or `limit_exceeded`.
- Events (server → client): `message:new` (the message), `message:deleted`, `message:moderated {conversationId, messageId, status}`, `read {conversationId, userId, upToMessageId}`, `typing:start|stop {conversationId, userId}`, `presence`, `participant:added|removed`, `error`. Client → server: `join` / `leave {conversationId}`, `typing:start|stop`. **A socket only receives a conversation's events after it joined that room** (the server checks participation); it is placed in its own user room automatically.
- REST: `GET /conversations?cursor&limit` → `{conversations (with unreadCount + participants), nextCursor}`; `GET /conversations/{id}` → `{conversation}`; `POST /conversations` `{type: direct|group, title?, participantUserIds}` → 201 `{conversation}`; `GET|POST /conversations/{id}/messages` (cursor, **newest first**; POST `{body, clientNonce?, replyToMessageId?}` → 201 `{message}`); `POST …/read {upToMessageId}`; `GET /conversations/unread-count` → `{unreadCount}`; `POST …/messages/{id}/report {reason, note?}` → 201.
- `clientNonce` is **not** an idempotency key: the server only echoes it on its internal event and the socket's `message:new` payload is the bare message. Reconciliation is therefore by `messageId`.

**Built:** `services/platform/messaging.*`, `libs/realtime.ts` (ticket per attempt via a function `auth`, socket.io backoff with jitter, rooms re-joined and REST backfill on every connect, close 30 s after backgrounding, torn down on tenant switch and sign-out, `useRealtimeSync` mounted in the drawer layout), `stores/messagingStore.ts` (not persisted; reset on tenant switch and sign-out), `utils/messaging.ts`, `libs/memberNames.ts`, `app/(drawer)/messages/{_layout,index,[conversationId]}.tsx` (list with unread badges, start a direct message from the member list, thread with inverted list, optimistic send with failed/retry, typing indicator, read marking, older pages, long-press to report), `components/messaging/*`, drawer entry with unread badge, strings in six languages. Tests: `__tests__/messaging.test.ts`, `__tests__/realtime.test.ts` (socket.io-client mocked).

**Deliberate deviations / not done:**
- **No offline outbox.** Unsent messages live in memory only (shown as "Not sent" with a retry tap); they are lost if the app is killed. The server has no idempotency for sends, so an automatic MMKV queue could double-send a message whose response was lost; revisit once the server dedupes by `clientNonce`.
- Group conversations can be read and replied to but not created in the app (needs a multi-select picker); participants management, attachments (Phase 15), message deletion and `presence` are not wired.
- Names come from the member list; if a plain member may not read it, rows show "Someone".
- No push (Phase 8 is server-gated); the badge is live only while the app is open.
- The new native-free dependency `socket.io-client` and the Phase 15 modules need no dev build to run in Expo Go, but none of this was run on a device or against a live gateway.

