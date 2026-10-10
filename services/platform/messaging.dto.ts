import { z } from "zod";

// ============================================================================
// Messaging — mirror of next-boilerplate messaging (REST + Socket.IO payloads).
// Dates arrive as ISO strings. A conversation list row carries its participants
// (a direct conversation has no title: it is named by the other participant).
// ============================================================================

export const ParticipantSchema = z.object({
  userId: z.string(),
  role: z.string().default("member"),
  lastReadMessageId: z.string().nullish(),
  lastReadAt: z.string().nullish(),
  joinedAt: z.string().nullish(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

export const ConversationSchema = z.object({
  conversationId: z.string(),
  type: z.enum(["direct", "group"]),
  title: z.string().nullish(),
  lastMessageAt: z.string().nullish(),
  lastMessagePreview: z.string().nullish(),
  /** Only on list rows; absent on a freshly created / fetched conversation. */
  unreadCount: z.number().default(0),
  participants: z.array(ParticipantSchema).default([]),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const ConversationListResponseSchema = z.object({ conversations: z.array(ConversationSchema), nextCursor: z.string().nullish() });
export const ConversationResponseSchema = z.object({ conversation: ConversationSchema });

export const AttachmentSchema = z.object({ url: z.string(), name: z.string(), mimeType: z.string(), size: z.number() });

/** CLEAN / FLAGGED / APPROVED are visible to everyone; the sender also sees their own PENDING / REJECTED / HIDDEN. */
export const MessageSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  senderUserId: z.string(),
  body: z.string(),
  contentType: z.string().default("text"),
  attachments: z.array(AttachmentSchema).nullish(),
  replyToMessageId: z.string().nullish(),
  moderationStatus: z.string().default("CLEAN"),
  createdAt: z.string(),
  /** Echoed by the server when the sender supplied one. */
  clientNonce: z.string().nullish(),
});
export type Message = z.infer<typeof MessageSchema>;

export const MessageListResponseSchema = z.object({ messages: z.array(MessageSchema), nextCursor: z.string().nullish() });
export const MessageResponseSchema = z.object({ message: MessageSchema });

export const UnreadCountResponseSchema = z.object({ unreadCount: z.number() });

export const CreateConversationRequestSchema = z
  .object({
    type: z.enum(["direct", "group"]),
    title: z.string().min(1).max(200).optional(),
    participantUserIds: z.array(z.string()).min(1).max(256),
  })
  .refine((v) => v.type !== "direct" || v.participantUserIds.length === 1, { message: "A direct conversation needs exactly one other person" })
  .refine((v) => v.type !== "group" || !!v.title, { message: "A group needs a title" });
export type CreateConversationRequest = z.infer<typeof CreateConversationRequestSchema>;

/** Conversation roles (server `ParticipantRoleEnum`). Only owner and admin may add people. */
export const PARTICIPANT_ROLES = ["owner", "admin", "member"] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

/** POST /conversations/{id}/participants (group conversations only; owner/admin). */
export const AddParticipantRequestSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(PARTICIPANT_ROLES).default("member"),
});
export type AddParticipantRequest = z.input<typeof AddParticipantRequestSchema>;
/** 201 `{ participant }`. */
export const ParticipantResponseSchema = z.object({ participant: ParticipantSchema });

export const SendMessageRequestSchema = z.object({
  body: z.string().min(1).max(8000),
  clientNonce: z.string().max(64).optional(),
  replyToMessageId: z.string().optional(),
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const REPORT_REASONS = ["spam", "harassment", "hate", "sexual", "violence", "self_harm", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** POST /messaging/ws-ticket (201). `wsUrl` is null when the operator configured none. */
export const WsTicketResponseSchema = z.object({
  ticket: z.string(),
  expiresIn: z.number(),
  wsUrl: z.string().nullish(),
  /** Socket.IO namespace: connect to `${wsUrl}${path}`. */
  path: z.string().default("/messaging"),
});
export type WsTicket = z.infer<typeof WsTicketResponseSchema>;

// ── Socket.IO events (server → client) ──────────────────────────────────────
export const TypingEventSchema = z.object({ conversationId: z.string(), userId: z.string() });
export const ReadEventSchema = z.object({ conversationId: z.string(), userId: z.string(), upToMessageId: z.string() });
export const MessageRefEventSchema = z.object({ conversationId: z.string(), messageId: z.string() });
export const ModeratedEventSchema = MessageRefEventSchema.extend({ status: z.string() });
