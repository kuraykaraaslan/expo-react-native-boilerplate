import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const NotificationTypeEnum = z.enum(["INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM"]);
export type NotificationType = z.infer<typeof NotificationTypeEnum>;

// ── Notification ──────────────────────────────────────────────────────────────

export const NotificationSchema = z.object({
  notificationId: z.string(),
  userId: z.string(),
  tenantId: z.string().optional().nullable(),
  type: NotificationTypeEnum.default("INFO"),
  title: z.string(),
  message: z.string().optional().nullable(),
  isRead: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// ── Request DTOs ──────────────────────────────────────────────────────────────

export const GetNotificationsRequestSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
});
export type GetNotificationsRequest = z.infer<typeof GetNotificationsRequestSchema>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

export const NotificationsResponseSchema = z.object({
  data: z.array(NotificationSchema).optional(),
  notifications: z.array(NotificationSchema).optional(),
  hasNext: z.boolean().optional().default(false),
  total: z.number().optional(),
});
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;
