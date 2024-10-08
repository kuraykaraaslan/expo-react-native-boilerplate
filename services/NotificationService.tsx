'use client';
import OTP from "@/types/OTP";
import User from "@/types/User";
import { AuthService } from "./AuthService";

import Notification from "@/types/Notification";

export class NotificationService {

    static AxiosInstance = AuthService.AxiosInstance;
    static ZustandStore: any;
    static SecureStore: any;
    static Toast: any;
    static Navigation: any;

    static initialize(ZustandStore: any, SecureStore: any, Toast: any) {
        console.log("NotificationService initialized");
        this.ZustandStore = ZustandStore;
        console.log("NotificationService ZustandStore", this.ZustandStore);
        this.SecureStore = SecureStore;
        this.Toast = Toast;

        //this.loadFromSecureStore();
    }

    static async loadFromSecureStore() {

        if (!this.SecureStore || !this.ZustandStore) {
            return;
        }

        console.log("NotificationService loaded from secure store");

    }

    static async flush() {
        this.ZustandStore?.useNotificationStore.setState({ notifications: [] });
        this.SecureStore.deleteItemAsync('notifications');
    }

    static async listAllNotificationsByUser(): Promise<Notification[] | null> {

        const response = await this?.AxiosInstance?.get('/v1/notifications/get-user-notifications').catch((error: any) => {
            return null;
        });

        const notifications = response.data;

        this.ZustandStore?.useNotificationStore.setState({ notifications });

        return notifications;
    }

}