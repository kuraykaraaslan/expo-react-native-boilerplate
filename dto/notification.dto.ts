import { z } from "zod";

// ── Notification ──────────────────────────────────────────────────────────────

export const NotificationSchema = z.object({
  notificationId: z.string().uuid(),
  title: z.string(),
  message: z.string().optional().nullable(),
  path: z.string().optional().nullable(),
  isRead: z.boolean().default(false),
  createdAt: z.string().optional().nullable(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

export const NotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema).default([]),
});
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;
