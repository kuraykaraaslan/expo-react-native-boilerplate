import type { Conversation, Message, Participant } from "@/services/platform/messaging.dto";

// ============================================================================
// Pure helpers for the messaging store — ordering and merging, kept free of
// React and the socket so they can be tested on their own.
// ============================================================================

/** Newest first (the thread is an inverted list); ties broken by id so the order is stable. */
export function compareNewestFirst(a: Pick<Message, "createdAt" | "messageId">, b: Pick<Message, "createdAt" | "messageId">): number {
  const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  return diff !== 0 && !Number.isNaN(diff) ? diff : b.messageId.localeCompare(a.messageId);
}

/** Inserts or replaces by `messageId` and keeps the list newest-first. Never produces duplicates. */
export function upsertMessage(list: Message[], message: Message): Message[] {
  const without = list.filter((m) => m.messageId !== message.messageId);
  return [...without, message].sort(compareNewestFirst);
}

/** Merges a fetched page into the list (REST backfill after a reconnect, or an older page). */
export function mergeMessages(list: Message[], incoming: Message[]): Message[] {
  const byId = new Map(list.map((m) => [m.messageId, m]));
  for (const m of incoming) byId.set(m.messageId, m);
  return [...byId.values()].sort(compareNewestFirst);
}

/** Most recently active first; conversations nobody wrote in yet sort by nothing and go last. */
export function sortConversations(list: Conversation[]): Conversation[] {
  const time = (c: Conversation) => (c.lastMessageAt ? Date.parse(c.lastMessageAt) : 0);
  return [...list].sort((a, b) => time(b) - time(a));
}

/** Title of a conversation as the viewer sees it: a group's title, else the other participant(s). */
export function conversationTitle(conversation: Conversation, viewerUserId: string | undefined, nameOf: (userId: string) => string | undefined, fallback: string): string {
  if (conversation.title) return conversation.title;
  const others = conversation.participants.filter((p) => p.userId !== viewerUserId).map((p) => nameOf(p.userId) ?? "").filter(Boolean);
  return others.length > 0 ? others.join(", ") : fallback;
}

/** "unread" is what the server counted plus nothing client-side: it is only ever replaced, never incremented blindly. */
export function totalUnread(list: Conversation[]): number {
  return list.reduce((sum, c) => sum + c.unreadCount, 0);
}

/** Owner and admin of a group may add people; a direct conversation has no roster to manage. */
export function canManageParticipants(conversation: Conversation, viewerUserId: string | undefined): boolean {
  if (conversation.type !== "group" || !viewerUserId) return false;
  const role = conversation.participants.find((p) => p.userId === viewerUserId)?.role;
  return role === "owner" || role === "admin";
}

/** Adds (or replaces, by user) a participant; returns the same conversation when nothing changed shape. */
export function withParticipant(conversation: Conversation, participant: Participant): Conversation {
  return { ...conversation, participants: [...conversation.participants.filter((p) => p.userId !== participant.userId), participant] };
}

const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, member: 2 };

/** Owner first, then admins, then members; ties by name. */
export function sortParticipants(list: Participant[], nameOf: (userId: string) => string | undefined): Participant[] {
  return [...list].sort((a, b) => (ROLE_RANK[a.role] ?? 3) - (ROLE_RANK[b.role] ?? 3) || (nameOf(a.userId) ?? "").localeCompare(nameOf(b.userId) ?? ""));
}

/** Client idempotency key for a send (server limit: 64 chars). One per message, reused by every retry of it. */
export function newClientNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Whether a failed send is worth retrying later. No response (offline, timeout), 401 (the session layer is
 * handling it), 408, 429 and 5xx are transient; any other refusal (400, 403 not a participant, 404, 413, 422 …)
 * will not change by resending the same message.
 */
export function isTransientSendFailure(statusCode: number | undefined): boolean {
  return statusCode === undefined || statusCode === 401 || statusCode === 408 || statusCode === 429 || statusCode >= 500;
}
