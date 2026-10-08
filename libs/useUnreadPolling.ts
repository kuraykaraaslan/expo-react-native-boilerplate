import { useEffect } from "react";
import { AppState } from "react-native";
import logger from "@/libs/logger";
import { NotificationClientService } from "@/services/user/notification.service.client";
import { useNotificationStore } from "@/stores/notificationStore";
import { useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Unread badge refresh
// The inbox endpoint returns the whole list (no count, no paging) and React
// Native has no EventSource for the SSE stream, so the badge polls while the
// app is in the foreground: on mount, on tenant switch, on resume, then every
// UNREAD_POLL_MS. Nothing runs in the background.
// ============================================================================

export const UNREAD_POLL_MS = 60_000;

/** Fetches the inbox of the active tenant and stores its unread count. A failure keeps the last value. */
export async function refreshUnreadCount(): Promise<void> {
  const tenantId = useTenantStore.getState().activeTenantId;
  try {
    const list = await NotificationClientService.getNotifications();
    // The user switched organization while this was in flight: that answer belongs to the old inbox.
    if (useTenantStore.getState().activeTenantId !== tenantId) return;
    useNotificationStore.getState().setUnreadCount(list.filter((n) => !n.isRead).length);
  } catch (err) {
    logger.warn("[unread] refresh failed", err); // background badge — no toast
  }
}

export function useUnreadPolling(): void {
  const tenantId = useTenantStore((s) => s.activeTenantId);

  useEffect(() => {
    // Never show the previous organization's count while the new one loads.
    useNotificationStore.getState().setUnreadCount(0);

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      void refreshUnreadCount();
      timer = setInterval(() => void refreshUnreadCount(), UNREAD_POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === "active") start();
    const sub = AppState.addEventListener("change", (state) => (state === "active" ? start() : stop()));
    return () => {
      sub.remove();
      stop();
    };
  }, [tenantId]);
}
