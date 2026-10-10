import axiosInstance from "@/libs/axios";
import {
  AddParticipantRequestSchema,
  ConversationListResponseSchema,
  ConversationResponseSchema,
  CreateConversationRequestSchema,
  MessageListResponseSchema,
  MessageResponseSchema,
  ParticipantResponseSchema,
  SendMessageRequestSchema,
  UnreadCountResponseSchema,
  WsTicketResponseSchema,
  type AddParticipantRequest,
  type Conversation,
  type CreateConversationRequest,
  type Message,
  type Participant,
  type ReportReason,
  type SendMessageRequest,
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
    return ConversationResponseSchema.parse(res.data).conversation;
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

  static async sendMessage(conversationId: string, payload: SendMessageRequest): Promise<Message> {
    const body = SendMessageRequestSchema.parse(payload);
    const res = await axiosInstance.post(`/conversations/${encodeURIComponent(conversationId)}/messages`, body);
    return MessageResponseSchema.parse(res.data).message;
  }

  static async markRead(conversationId: string, upToMessageId: string): Promise<void> {
    await axiosInstance.post(`/conversations/${encodeURIComponent(conversationId)}/read`, { upToMessageId });
  }

  static async reportMessage(conversationId: string, messageId: string, reason: ReportReason, note?: string): Promise<void> {
    await axiosInstance.post(`/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/report`, { reason, note });
  }
}
