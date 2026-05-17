import axiosInstance from "@/libs/axios";
import { Notification, NotificationsResponseSchema } from "@/dto/notification.dto";

export class NotificationClientService {
  static async getNotifications(): Promise<Notification[]> {
    const res = await axiosInstance.get("/api/system/auth/me/notifications");
    const parsed = NotificationsResponseSchema.parse(res.data);
    return parsed.notifications;
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await axiosInstance.put(`/api/system/auth/me/notifications/${notificationId}/read`);
  }

  static async markAllAsRead(): Promise<void> {
    await axiosInstance.put("/api/system/auth/me/notifications/read-all");
  }

  static async clearAll(): Promise<void> {
    await axiosInstance.delete("/api/system/auth/me/notifications");
  }
}
