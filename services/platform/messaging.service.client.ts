import axiosInstance from "@/libs/axios";
import {
  AddParticipantRequestSchema,
  ConversationListResponseSchema,
  ConversationResponseSchema,
  CreateConversationRequestSchema,
  MessageListResponseSchema,
  ParticipantResponseSchema,
  SendMessageRequestSchema,
  SendMessageResponseSchema,
  UnreadCountResponseSchema,
  WsTicketResponseSchema,
  type AddParticipantRequest,
  type Conversation,
  type CreateConversationRequest,
  type Message,
  type Participant,
  type ReportReason,
  type SendMessageRequest,
  type SendMessageResponse,
  type WsTicket,
} from "@/services/platform/messaging.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export class MessagingClientService {
  /** Single-use handshake ticket (30 s). Mint one per connection attempt. */
  static async createWsTicket(tenantId?: string): Promise<WsTicket> {
    const res = await axiosInstance.post("/messaging/ws-ticket", {}, { tenantId });
    return WsTicketResponseSchema.parse(res.data);
  }

  static async listConversations(params: { cursor?: string; limit?: number } = {}): Promise<{ conversations: Conversation[]; nextCursor: string | null }> {
    const res = await axiosInstance.get("/conversations", { params: { cursor: params.cursor, limit: params.limit ?? 30 } });
    const parsed = ConversationListResponseSchema.parse(res.data);
    return { conversations: parsed.conversations, nextCursor: parsed.nextCursor ?? null };
  }

  static async getConversation(conversationId: string): Promise<Conversation> {
    const res = await axiosInstance.get(`/conversations/${encodeURIComponent(conversationId)}`);
    return ConversationResponseSchema.parse(res.data).conversation;
  }

  static async createConversation(payload: CreateConversationRequest): Promise<Conversation> {
    const body = CreateConversationRequestSchema.parse(payload);
    const res = await axiosInstance.post("/conversations", body);
    const created = ConversationResponseSchema.parse(res.data).conversation;
    // The create route answers with the bare conversation (no roster); the detail route carries the participants
    // the thread header and the roster sheet need (and the creator's owner role, which gates adding people).
    const hasRoster = Array.isArray((res.data as { conversation?: { participants?: unknown } })?.conversation?.participants);
    return hasRoster ? created : this.getConversation(created.conversationId);
  }

  /** Adds a person to a group conversation (owner/admin only; a direct conversation refuses). 409 when already in. */
  static async addParticipant(conversationId: string, payload: AddParticipantRequest): Promise<Participant> {
    const body = AddParticipantRequestSchema.parse(payload);
    const res = await axiosInstance.post(`/conversations/${encodeURIComponent(conversationId)}/participants`, body);
    return ParticipantResponseSchema.parse(res.data).participant;
  }

  static async getUnreadCount(): Promise<number> {
    const res = await axiosInstance.get("/conversations/unread-count");
    return UnreadCountResponseSchema.parse(res.data).unreadCount;
  }

  /** Newest first; pass the previous `nextCursor` to go further back. */
  static async listMessages(conversationId: string, params: { cursor?: string; limit?: number } = {}): Promise<{ messages: Message[]; nextCursor: string | null }> {
    const res = await axiosInstance.get(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
      params: { cursor: params.cursor, limit: params.limit ?? 30 },
    });
    const parsed = MessageListResponseSchema.parse(res.data);
    return { messages: parsed.messages, nextCursor: parsed.nextCursor ?? null };
  }

  /**
   * Idempotent per (sender, conversation, `clientNonce`): a retry of a send that already landed answers 200 with
   * `replayed: true` and the original message, which callers treat as success.
   */
  static async sendMessage(conversationId: string, payload: SendMessageRequest): Promise<SendMessageResponse> {
    const body = SendMessageRequestSchema.parse(payload);
    const res = await axiosInstance.post(`/conversations/${encodeURIComponent(conversationId)}/messages`, body);
    return SendMessageResponseSchema.parse(res.data);
  }

  static async markRead(conversationId: string, upToMessageId: string): Promise<void> {
    await axiosInstance.post(`/conversations/${encodeURIComponent(conversationId)}/read`, { upToMessageId });
  }

  static async reportMessage(conversationId: string, messageId: string, reason: ReportReason, note?: string): Promise<void> {
    await axiosInstance.post(`/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/report`, { reason, note });
  }
}
