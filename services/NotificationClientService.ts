import { z } from "zod";
import axiosInstance from "@/libs/axios";
import { Notification, NotificationSchema } from "@/dto/notification.dto";

export interface NotificationsPage {
  notifications: Notification[];
  hasNext: boolean;
}

export class NotificationClientService {
  static async getNotifications(page = 1, limit = 20): Promise<NotificationsPage> {
    const res = await axiosInstance.get("/api/system/notifications", {
      params: { page, limit },
    });
    const notifications = z
      .array(NotificationSchema)
      .parse(res.data?.data ?? res.data?.notifications ?? []);
    return {
      notifications,
      hasNext: res.data?.hasNext ?? notifications.length === limit,
    };
  }
}
