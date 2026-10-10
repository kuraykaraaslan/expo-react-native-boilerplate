import { useEffect } from "react";
import { AppState } from "react-native";
import { io, type Socket } from "socket.io-client";
import logger from "@/libs/logger";
import { MessagingClientService } from "@/services/platform/messaging.service.client";
import {
  MessageRefEventSchema,
  MessageSchema,
  ModeratedEventSchema,
  ReadEventSchema,
  TypingEventSchema,
} from "@/services/platform/messaging.dto";
import { useAuthStore } from "@/stores/authStore";
import { useMessagingStore } from "@/stores/messagingStore";
import { getActiveTenantId, useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Realtime transport — one Socket.IO connection to the gateway's /messaging
// namespace for the ACTIVE tenant.
//   - Handshake: a single-use ticket (30 s) from POST /messaging/ws-ticket,
//     minted fresh for EVERY connection attempt (auth is a function, which
//     socket.io-client calls again on each reconnect).
//   - Reconnects use socket.io's exponential backoff with jitter.
//   - The gateway only delivers a conversation's events to sockets that joined
//     its room, so the joined set is re-sent after every reconnect.
//   - Events go straight into the messaging store; screens never touch the socket.
//   - Backgrounded for > BACKGROUND_GRACE_MS → closed (iOS suspends sockets);
//     foregrounding reconnects and backfills what was missed from REST.
//   - Switching tenant or signing out tears it down: no event of the old
//     tenant can reach the new one.
// ============================================================================

export const BACKGROUND_GRACE_MS = 30_000;
const JOIN_CAP = 100; // conversations joined at once; the list is paged at 30

let socket: Socket | null = null;
let boundTenant: string | null = null;
let generation = 0;
const rooms = new Set<string>();
let openConversationId: string | null = null;

const store = () => useMessagingStore.getState();

/** The thread screen tells the transport which conversation is on screen (its messages are not "unread"). */
export function setOpenConversation(id: string | null): void {
  openConversationId = id;
}

export function getOpenConversation(): string | null {
  return openConversationId;
}

/** REST backfill of the list (and the open thread): run on every (re)connect so nothing sent while away is lost. */
export async function backfill(): Promise<void> {
  const tenantId = getActiveTenantId();
  try {
    const { conversations } = await MessagingClientService.listConversations();
    if (getActiveTenantId() !== tenantId) return; // switched while in flight
    store().setConversations(conversations);
    conversations.slice(0, JOIN_CAP).forEach((c) => joinRoom(c.conversationId));
    const open = openConversationId;
    if (open) {
      const { messages } = await MessagingClientService.listMessages(open);
      if (getActiveTenantId() === tenantId) store().mergeThread(open, messages);
    }
  } catch (err) {
    logger.warn("[realtime] backfill failed", err); // background — no toast
  }
}

export function joinRoom(conversationId: string): void {
  rooms.add(conversationId);
  if (socket?.connected) socket.emit("join", { conversationId });
}

export function leaveRoom(conversationId: string): void {
  rooms.delete(conversationId);
  if (socket?.connected) socket.emit("leave", { conversationId });
}

export function sendTyping(conversationId: string, on: boolean): void {
  if (socket?.connected) socket.emit(on ? "typing:start" : "typing:stop", { conversationId });
}

function bindEvents(s: Socket, tenantId: string): void {
  const current = () => boundTenant === tenantId && socket === s;
  const me = () => useAuthStore.getState().user?.userId;

  s.on("connect", () => {
    if (!current()) return;
    store().setConnection("connected");
    rooms.forEach((id) => s.emit("join", { conversationId: id }));
    void backfill();
  });
  // socket.io retries by itself only for transport failures. A refusal by the gateway's handshake
  // middleware (`connect_error` with `s.active === false`) or a server-initiated disconnect leaves
  // the socket closed, so reconnect by hand with backoff — each attempt mints a fresh ticket.
  let manualAttempts = 0;
  let manualTimer: ReturnType<typeof setTimeout> | null = null;
  const reviveLater = () => {
    if (manualTimer || !current()) return;
    const delay = Math.min(30_000, 1_000 * 2 ** manualAttempts++) * (0.5 + Math.random() / 2);
    manualTimer = setTimeout(() => {
      manualTimer = null;
      if (current() && !s.connected) s.connect();
    }, delay);
  };
  s.on("connect", () => {
    manualAttempts = 0;
  });
  s.on("disconnect", (reason: string) => {
    if (!current()) return;
    store().setConnection("reconnecting");
    if (reason === "io server disconnect") reviveLater();
  });
  s.on("connect_error", (err) => {
    if (!current()) return;
    logger.warn("[realtime] connect error", err.message);
    store().setConnection("reconnecting");
    if (!s.active) reviveLater();
  });

  s.on("message:new", (raw: unknown) => {
    if (!current()) return;
    const parsed = MessageSchema.safeParse(raw);
    if (!parsed.success) return;
    const message = parsed.data;
    store().receiveMessage(message, { fromMe: message.senderUserId === me(), open: openConversationId === message.conversationId });
    // A conversation the list doesn't know yet (someone started one with us): fetch the list again.
    if (!store().conversations.some((c) => c.conversationId === message.conversationId)) void backfill();
  });
  s.on("message:deleted", (raw: unknown) => {
    const parsed = MessageRefEventSchema.safeParse(raw);
    if (current() && parsed.success) store().removeMessage(parsed.data.conversationId, parsed.data.messageId);
  });
  s.on("message:moderated", (raw: unknown) => {
    const parsed = ModeratedEventSchema.safeParse(raw);
    if (current() && parsed.success) store().setModeration(parsed.data.conversationId, parsed.data.messageId, parsed.data.status);
  });
  s.on("typing:start", (raw: unknown) => {
    const parsed = TypingEventSchema.safeParse(raw);
    if (current() && parsed.success && parsed.data.userId !== me()) store().setTyping(parsed.data.conversationId, parsed.data.userId, true);
  });
  s.on("typing:stop", (raw: unknown) => {
    const parsed = TypingEventSchema.safeParse(raw);
    if (current() && parsed.success) store().setTyping(parsed.data.conversationId, parsed.data.userId, false);
  });
  s.on("read", (raw: unknown) => {
    const parsed = ReadEventSchema.safeParse(raw);
    // Our own read (from another device) clears the badge here too.
    if (current() && parsed.success && parsed.data.userId === me()) store().setUnread(parsed.data.conversationId, 0);
  });
  s.on("participant:added", () => current() && void backfill());
  s.on("participant:removed", () => current() && void backfill());
  s.on("error", (e: unknown) => logger.warn("[realtime] server error", e));
}

/** Connects to `tenantId`'s gateway (no-op when already connected to it). Resolves once the attempt is set up. */
export async function connectRealtime(tenantId: string): Promise<void> {
  if (socket && boundTenant === tenantId) return;
  disconnectRealtime();
  const gen = ++generation;
  boundTenant = tenantId;
  store().setConnection("connecting");

  let first;
  try {
    first = await MessagingClientService.createWsTicket(tenantId);
  } catch (err) {
    if (gen === generation) {
      store().setConnection("idle");
      boundTenant = null;
      logger.warn("[realtime] ticket request failed", err);
    }
    return;
  }
  if (gen !== generation) return; // tenant switched or signed out while the ticket was in flight
  if (!first.wsUrl) {
    boundTenant = null;
    store().setConnection("idle");
    logger.warn("[realtime] the server has no WebSocket gateway configured");
    return;
  }

  let firstTicket: string | null = first.ticket;
  const s = io(`${first.wsUrl.replace(/\/+$/, "")}${first.path}`, {
    transports: ["websocket"], // long-polling would need sticky sessions; the gateway speaks WebSocket
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 15_000,
    randomizationFactor: 0.5,
    // Called for the first connect AND every reconnect: tickets are single use, so always a new one.
    auth: (cb) => {
      if (firstTicket) {
        const ticket = firstTicket;
        firstTicket = null;
        cb({ ticket });
        return;
      }
      MessagingClientService.createWsTicket(tenantId)
        .then((t) => cb({ ticket: t.ticket }))
        .catch(() => cb({ ticket: "" })); // refused by the gateway → connect_error → backoff → try again
    },
  });
  socket = s;
  bindEvents(s, tenantId);
}

/** Closes the socket and forgets this tenant's rooms and state. Safe to call at any time. */
export function disconnectRealtime(): void {
  generation += 1;
  const s = socket;
  socket = null;
  boundTenant = null;
  rooms.clear();
  s?.removeAllListeners(); // also silences the reconnect timer: its `current()` check fails
  s?.disconnect();
  store().setConnection("idle");
}

/** Sign-out / tenant switch: close the socket and drop everything it delivered. */
export function resetRealtime(): void {
  disconnectRealtime();
  store().reset();
}

/** Mount once under the signed-in shell. */
export function useRealtimeSync(enabled: boolean): void {
  const tenantId = useTenantStore((s) => s.activeTenantId);

  useEffect(() => {
    if (!enabled) return;
    const tenant = getActiveTenantId();
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    // A different organization's conversations must never show up under this one.
    store().reset();
    if (AppState.currentState === "active") void connectRealtime(tenant);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = null;
        void connectRealtime(tenant).then(backfill);
      } else if (!closeTimer) {
        closeTimer = setTimeout(() => {
          closeTimer = null;
          disconnectRealtime();
        }, BACKGROUND_GRACE_MS);
      }
    });
    return () => {
      sub.remove();
      if (closeTimer) clearTimeout(closeTimer);
      resetRealtime();
    };
  }, [enabled, tenantId]);
}
