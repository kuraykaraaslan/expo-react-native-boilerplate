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
- [x] Offline: queue unsent messages in MMKV and flush on reconnect, with de-duplication using a client message id (done 2026-10-10: `clientNonce`, see "Offline outbox").
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
- *(Superseded 2026-10-10: `clientNonce` IS now an idempotency key and rides in the message, see "Offline outbox" below.)*

**Built:** `services/platform/messaging.*`, `libs/realtime.ts` (ticket per attempt via a function `auth`, socket.io backoff with jitter, rooms re-joined and REST backfill on every connect, close 30 s after backgrounding, torn down on tenant switch and sign-out, `useRealtimeSync` mounted in the drawer layout), `stores/messagingStore.ts` (not persisted; reset on tenant switch and sign-out), `utils/messaging.ts`, `libs/memberNames.ts`, `app/(drawer)/messages/{_layout,index,[conversationId]}.tsx` (list with unread badges, start a direct message from the member list, thread with inverted list, optimistic send with failed/retry, typing indicator, read marking, older pages, long-press to report), `components/messaging/*`, drawer entry with unread badge, strings in six languages. Tests: `__tests__/messaging.test.ts`, `__tests__/realtime.test.ts` (socket.io-client mocked).

**Deliberate deviations / not done:**
- *(Superseded 2026-10-10, see "Offline outbox" below: the server now dedupes sends by `clientNonce` and the outbox is built.)*
- Group conversations can be read and replied to but not created in the app (needs a multi-select picker); participants management, attachments (Phase 15), message deletion and `presence` are not wired.
- Names come from the member list; if a plain member may not read it, rows show "Someone".
- No push (Phase 8 is server-gated); the badge is live only while the app is open.
- The new native-free dependency `socket.io-client` and the Phase 15 modules need no dev build to run in Expo Go, but none of this was run on a device or against a live gateway.

**Corrections 2026-10-10 (review):** a gateway refusal (`connect_error` with an inactive socket) or a server-side disconnect does not trigger socket.io's own retry, so `libs/realtime.ts` now reconnects by hand with backoff and a fresh ticket. Thread loads, send confirmations and the member directory (now paged, up to 1000) drop answers that arrive after a tenant switch; the read-marking effect fires only when the newest message changes. Search and the API key / domain screens got the same stale-answer guards; the flag cache is cleared on sign-out and never written while signed out.


---

## 🟡 Group conversations — 2026-10-10

**Contract check (server source, `modules/messaging/server`):** `POST /conversations` takes `{type, title?, participantUserIds (1..256), metadata?}`; a group requires a title and the caller becomes owner. `POST /conversations/{id}/participants` takes `{userId, role: owner|admin|member = member}` and returns 201 `{participant}`; it needs a conversation owner/admin (`assertCanManageParticipants`), refuses direct conversations (400) and a person already in (409). The same route file has **only POST and DELETE: there is no `GET` for participants**, so the roster comes from `participants` on the conversation (list rows and `GET /conversations/{id}`).

**Built:**
- `NewConversationModal`: Direct / Group switch; group mode has a name field, a multi-select people list (checkboxes) and a Create button (success haptic); a result that arrives after an organization switch is dropped, as is a stale member directory.
- `components/messaging/ParticipantsSheet.tsx`: roster with role badges, "You" marker, owner first; owner/admin get "Add people" with a filterable picker of members not yet in the group (adds as `member`, success haptic and toast, store updated in place). Resets on close, conversation change and organization switch; add answers after a switch are dropped.
- Thread header: group threads show a participant count and a "People" action opening the sheet.
- `AddParticipantRequestSchema` / `ParticipantResponseSchema`, `MessagingClientService.addParticipant`, helpers `canManageParticipants`, `withParticipant`, `sortParticipants`; strings in all six locales; tests in `__tests__/messaging.test.ts`.

**Deviations / not done:**
- Removing a person or leaving a group (`DELETE …/participants?userId=`) and changing roles are not built; adds always use the `member` role.
- The server does not tell a plain member whether they may add people beyond their conversation role: the control is hidden unless the viewer is owner/admin of that group. The tenant-level permission `messaging.participants.add` is not checked client-side; a refusal surfaces through the normal error toast.
- Names in the roster come from the tenant member list; if the viewer may not read it, rows show "Someone".
- Not run on a device or against a live server.

## 2026-10-10 — Review corrections for group conversations

- **Server contract:** `POST /conversations` answers with the bare conversation (`SafeConversation`, no `participants`). The client defaulted the roster to `[]`, so a freshly created group showed 0 people and the creator (owner) could not add anyone, and a new direct thread could not be titled. `createConversation` now fetches the detail route when the response carries no roster.
- **Haptics:** success feedback after create/add is fire-and-forget, so a haptics failure can no longer surface an error for a group that was created.
- **Tests:** create-then-detail fetch, creator recognised as owner.
- **Not done:** removing a participant / leaving (`DELETE .../participants?userId=`) is not built; the sheet only adds. UI components are not rendered in Jest (no component test harness here); not verified on a device.

## 🟡 Offline outbox — 2026-10-10

**Contract check (read from the UNCOMMITTED working tree of next-boilerplate, `modules/messaging/server`, not from the agent's summary):**
- `POST /conversations/{id}/messages` body `{body, contentType?, attachments?, replyToMessageId?, clientNonce? (string, max 64)}`. Idempotent per **(tenant, conversation, sender, `clientNonce`)** (partial unique index `uq_message_client_nonce`; no nonce means no dedupe).
- First send: **201** `{message, replayed: false}`. Replay: **200** `{message, replayed: true}` where `message` is the ORIGINAL stored message (same `messageId`, `createdAt`, `clientNonce`); none of the realtime / webhook / push / search / moderation side effects run again. Two racing retries also collapse to one (unique violation is caught and resolved to the winner).
- The replay lookup runs **after** the participant check: someone removed from the conversation gets 403, not a replay. It runs **before** moderation, so a replayed message that was held still comes back with its original `moderationStatus`.
- `clientNonce` is part of `SafeMessage` (`string | null`), so it is in list responses and in the Socket.IO `message:new` payload. The gateway emits the **bare message** (`event.message`) to the room; the top-level `clientNonce` of the internal event is not forwarded, only the one inside the message. A held (quarantined) message is NOT broadcast: the sender only gets `message:moderated {status: PENDING}` on the user room, without a nonce, so for that case the REST answer (or the next replay/backfill) is what settles the outbox entry.

**Built:**
- `stores/outboxStore.ts` (persisted to MMKV through `zustandMMKVStorage`, key `outbox-storage`, Zod-validated on rehydrate; an entry that was `sending` when the app died comes back `queued`). Each entry carries `tenantId` and `userId`; no tokens, only message text.
- `libs/outbox.ts`: `queueMessage` (write to the outbox, then flush), `flushOutbox` (single flight, oldest first, one at a time, each with its ORIGINAL nonce, 200 `replayed:true` is success), `retryQueued`, `reconcileOutbox`, `clearOutbox`, `pruneOutboxFor`. A transient failure (no response, 401, 408, 429, 5xx) puts the entry back to `queued` and stops the run so order is kept; any other refusal marks it `failed` (error haptic + the usual error toast) and the run moves on.
- Flush triggers: socket `connect` (including every reconnect), app resume, mount of the signed-in shell (messages left from before an app kill), a new send, tapping retry.
- Reconciliation: a `message:new` (or a REST page, in backfill and when opening a thread) whose `clientNonce` matches one of the viewer's entries in that conversation removes the optimistic bubble; the real message is upserted by `messageId`, so a socket echo, a replay and a backfill never produce two bubbles.
- Tenant isolation: the flusher and the thread only read entries of the active (tenant, user); every answer is re-checked against that scope after the await (like `libs/realtime.ts`), so an answer that lands after an organization switch is not shown in the new one. Entries of another organization stay on disk until their owner is active again; entries of another user are pruned when a different account signs in. Sign-out (`libs/logout.ts`) and the interceptor's last-session-ended path (`libs/axios.ts`) clear the whole outbox.
- `messagingStore.pending` and its four actions were removed (replaced by the outbox plus `confirmSent`). Thread UI: queued shows "Waiting to send…", failed shows "Not sent", both with a retry tap; long-press discards (confirm dialog). `SendMessageResponseSchema` carries `replayed`; `MessagingClientService.sendMessage` now returns `{message, replayed}`. New strings (`MESSAGES.QUEUED`, `DISCARD*`) in all six locales.
- Tests: `__tests__/outbox.test.ts` (order, original nonce on every retry, replay as success, transient vs permanent failure, tenant/user scoping, switch during flight, sign-out wipe, MMKV round trip with corrupt data, socket reconcile) and updates in `__tests__/messaging.test.ts`.

**Deviations / not done:**
- No timer-based retry: after a transient failure the next trigger (socket connect, resume, new send, retry tap) continues. If the socket stays connected while the REST route keeps failing, the message waits until one of those happens.
- A permanent refusal of one message does not block later messages of the same conversation (they are sent; the failed one stays visible and retryable).
- Text only (attachments are still Phase 15). The outbox is MMKV, which `libs/mmkv.ts` does not encrypt; entries hold message text of the signed-in user and are wiped on sign-out.
- Not run on a device or against a live server; the replay behaviour is verified from source and with MSW only.

**Owner still has to supply:** nothing for this item (no new env or identifiers). Deploying the next-boilerplate working-tree changes (idempotent send) is required before replays work against a real server; until then a resend of a lost response would create a duplicate.
