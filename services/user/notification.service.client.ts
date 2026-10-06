import axiosInstance from "@/libs/axios";
import { AckResponseSchema } from "@/services/auth/auth.dto";
import { Notification, NotificationsResponseSchema } from "@/services/user/notification.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export class NotificationClientService {
  static async getNotifications(): Promise<Notification[]> {
    const res = await axiosInstance.get("/auth/me/notifications");
    return NotificationsResponseSchema.parse(res.data).notifications;
  }

  /** Marking one notification read is `PUT …/notifications/{id}` (there is no `/read` suffix). */
  static async markAsRead(notificationId: string): Promise<void> {
    const res = await axiosInstance.put(`/auth/me/notifications/${encodeURIComponent(notificationId)}`);
    AckResponseSchema.parse(res.data);
  }

  static async markAllAsRead(): Promise<void> {
    const res = await axiosInstance.put("/auth/me/notifications/read-all");
    AckResponseSchema.parse(res.data);
  }

  static async remove(notificationId: string): Promise<void> {
    const res = await axiosInstance.delete(`/auth/me/notifications/${encodeURIComponent(notificationId)}`);
    AckResponseSchema.parse(res.data);
  }

  static async clearAll(): Promise<void> {
    const res = await axiosInstance.delete("/auth/me/notifications");
    AckResponseSchema.parse(res.data);
  }
}
