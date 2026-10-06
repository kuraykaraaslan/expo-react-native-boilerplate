import { z } from "zod";

// ============================================================================
// In-app notifications — mirror of next-boilerplate notification_inapp.types.
// ============================================================================

export const NotificationActionSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const NotificationSchema = z.object({
  notificationId: z.string(),
  title: z.string(),
  message: z.string(),
  path: z.string().nullish(),
  /** Category, e.g. 'billing' / 'security'. */
  type: z.string().nullish(),
  action: NotificationActionSchema.nullish(),
  expiresAt: z.string().nullish(),
  isRead: z.boolean().default(false),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

/** GET /auth/me/notifications */
export const NotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema).default([]),
});
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;
