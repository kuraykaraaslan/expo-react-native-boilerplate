import { create } from "zustand";
import type { Conversation, Message } from "@/services/platform/messaging.dto";
import { mergeMessages, sortConversations, upsertMessage } from "@/utils/messaging";

// ============================================================================
// Messaging store — conversations, threads, typing and the connection state.
// Deliberately NOT persisted: it mirrors the active organization's server state
// and is rebuilt from REST on every start, so nothing can leak across tenants
// or sign-outs (`reset()` runs on both).
// ============================================================================

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting";

/** A message the user sent that the server has not confirmed (or refused). */
export type PendingMessage = { nonce: string; conversationId: string; body: string; createdAt: string; status: "sending" | "failed" };

/** How long a typing indicator stays up without a refresh. */
export const TYPING_TTL_MS = 5_000;

interface MessagingState {
  connection: ConnectionState;
  conversations: Conversation[];
  conversationsLoaded: boolean;
  /** conversationId → messages, newest first. */
  messages: Record<string, Message[]>;
  /** conversationId → cursor for the next older page (null: reached the start). */
  olderCursor: Record<string, string | null>;
  pending: PendingMessage[];
  /** conversationId → userId → expiry (ms epoch). */
  typing: Record<string, Record<string, number>>;
  /** userId → display name, from the member list (best effort: a plain member may not be allowed to read it). */
  names: Record<string, string>;
  setConnection: (state: ConnectionState) => void;
  setConversations: (list: Conversation[]) => void;
  upsertConversation: (conversation: Conversation) => void;
  setUnread: (conversationId: string, unreadCount: number) => void;
  mergeThread: (conversationId: string, messages: Message[], olderCursor?: string | null) => void;
  receiveMessage: (message: Message, opts: { fromMe: boolean; open: boolean }) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  setModeration: (conversationId: string, messageId: string, status: string) => void;
  addPending: (p: PendingMessage) => void;
  settlePending: (nonce: string, message: Message | null) => void;
  failPending: (nonce: string) => void;
  retryPending: (nonce: string) => void;
  setTyping: (conversationId: string, userId: string, on: boolean, now?: number) => void;
  setNames: (names: Record<string, string>) => void;
  reset: () => void;
}

const INITIAL = {
  connection: "idle" as ConnectionState,
  conversations: [] as Conversation[],
  conversationsLoaded: false,
  messages: {} as Record<string, Message[]>,
  olderCursor: {} as Record<string, string | null>,
  pending: [] as PendingMessage[],
  typing: {} as Record<string, Record<string, number>>,
  names: {} as Record<string, string>,
};

export const useMessagingStore = create<MessagingState>()((set) => ({
  ...INITIAL,

  setConnection: (connection) => set({ connection }),

  setConversations: (list) => set({ conversations: sortConversations(list), conversationsLoaded: true }),

  upsertConversation: (conversation) =>
    set((s) => ({ conversations: sortConversations([...s.conversations.filter((c) => c.conversationId !== conversation.conversationId), conversation]) })),

  setUnread: (conversationId, unreadCount) =>
    set((s) => ({ conversations: s.conversations.map((c) => (c.conversationId === conversationId ? { ...c, unreadCount } : c)) })),

  mergeThread: (conversationId, messages, olderCursor) =>
    set((s) => ({
      messages: { ...s.messages, [conversationId]: mergeMessages(s.messages[conversationId] ?? [], messages) },
      // `undefined` keeps the known cursor: a backfill of the newest page must not rewind paging.
      olderCursor: olderCursor === undefined ? s.olderCursor : { ...s.olderCursor, [conversationId]: olderCursor },
    })),

  receiveMessage: (message, { fromMe, open }) =>
    set((s) => {
      const known = s.conversations.find((c) => c.conversationId === message.conversationId);
      const conversations = known
        ? sortConversations(
            s.conversations.map((c) =>
              c.conversationId === message.conversationId
                ? { ...c, lastMessageAt: message.createdAt, lastMessagePreview: message.body.slice(0, 120), unreadCount: fromMe || open ? c.unreadCount : c.unreadCount + 1 }
                : c,
            ),
          )
        : s.conversations; // a conversation we don't have yet arrives through the list refresh
      return {
        conversations,
        messages: { ...s.messages, [message.conversationId]: upsertMessage(s.messages[message.conversationId] ?? [], message) },
      };
    }),

  removeMessage: (conversationId, messageId) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: (s.messages[conversationId] ?? []).filter((m) => m.messageId !== messageId) } })),

  setModeration: (conversationId, messageId, status) =>
    set((s) => ({
      messages: { ...s.messages, [conversationId]: (s.messages[conversationId] ?? []).map((m) => (m.messageId === messageId ? { ...m, moderationStatus: status } : m)) },
    })),

  addPending: (p) => set((s) => ({ pending: [...s.pending.filter((x) => x.nonce !== p.nonce), p] })),

  // The server answered: drop the optimistic copy and keep the real message (deduped by id with any socket echo).
  settlePending: (nonce, message) =>
    set((s) => {
      const gone = s.pending.find((p) => p.nonce === nonce);
      const pending = s.pending.filter((p) => p.nonce !== nonce);
      if (!message) return { pending };
      return {
        pending,
        messages: { ...s.messages, [message.conversationId]: upsertMessage(s.messages[message.conversationId] ?? [], message) },
        conversations: sortConversations(
          s.conversations.map((c) => (c.conversationId === (gone?.conversationId ?? message.conversationId) ? { ...c, lastMessageAt: message.createdAt, lastMessagePreview: message.body.slice(0, 120) } : c)),
        ),
      };
    }),

  failPending: (nonce) => set((s) => ({ pending: s.pending.map((p) => (p.nonce === nonce ? { ...p, status: "failed" as const } : p)) })),

  retryPending: (nonce) => set((s) => ({ pending: s.pending.map((p) => (p.nonce === nonce ? { ...p, status: "sending" as const } : p)) })),

  setTyping: (conversationId, userId, on, now = Date.now()) =>
    set((s) => {
      const forConversation = { ...(s.typing[conversationId] ?? {}) };
      if (on) forConversation[userId] = now + TYPING_TTL_MS;
      else delete forConversation[userId];
      return { typing: { ...s.typing, [conversationId]: forConversation } };
    }),

  setNames: (names) => set((s) => ({ names: { ...s.names, ...names } })),

  reset: () => set({ ...INITIAL }),
}));
