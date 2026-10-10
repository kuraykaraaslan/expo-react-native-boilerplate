import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import logger from "@/libs/logger";
import { getOpenConversation } from "@/libs/realtime";
import { pushSupported, pushTargetFor, registerPushForActiveTenant } from "@/libs/push";
import { usePushStore } from "@/stores/pushStore";
import { useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Mounted once under the signed-in shell (like useRealtimeSync):
//   - foreground presentation: show the system banner, except for the conversation that is on screen
//   - registers the Expo token for the active organization when it opens or becomes active
//   - re-registers when the OS rotates the device token
//   - a tap on a notification opens the matching screen (also from a cold start)
// ============================================================================

/** Notification presentation while the app is open. */
export async function foregroundBehavior(notification: Notifications.Notification): Promise<Notifications.NotificationBehavior> {
  const target = pushTargetFor(notification.request.content.data);
  const onScreen = target.kind === "conversation" && target.conversationId === getOpenConversation();
  return { shouldShowBanner: !onScreen, shouldShowList: !onScreen, shouldPlaySound: false, shouldSetBadge: false };
}

let handledResponseId: string | null = null;

/** Opens the screen a tapped notification points to. Each notification is handled once. */
export function openFromResponse(response: Notifications.NotificationResponse | null | undefined): void {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const id = response.notification.request.identifier;
  if (handledResponseId === id) return;
  handledResponseId = id;
  const target = pushTargetFor(response.notification.request.content.data);
  if (target.kind === "conversation") {
    router.push({ pathname: "/messages/[conversationId]", params: { conversationId: target.conversationId } });
  } else {
    router.push("/notifications");
  }
}

export function usePushNotifications(enabled: boolean): void {
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const deviceEnabled = usePushStore((s) => s.enabled);

  // Foreground presentation (set once; the handler reads live state).
  useEffect(() => {
    if (!pushSupported()) return;
    Notifications.setNotificationHandler({ handleNotification: foregroundBehavior });
    return () => Notifications.setNotificationHandler(null);
  }, []);

  // Register for the organization that is active now, and again whenever another becomes active.
  useEffect(() => {
    if (!enabled || !deviceEnabled || !pushSupported()) return;
    void registerPushForActiveTenant();
  }, [enabled, deviceEnabled, tenantId]);

  // The OS rotated the device token: the Expo token may have changed with it.
  useEffect(() => {
    if (!enabled || !deviceEnabled || !pushSupported()) return;
    const sub = Notifications.addPushTokenListener(() => {
      logger.info("[push] device token rotated, registering again");
      void registerPushForActiveTenant();
    });
    return () => sub.remove();
  }, [enabled, deviceEnabled]);

  // Taps: only once the signed-in shell is open (a cold-start tap waits for the session restore). The hook
  // `Notifications.useLastNotificationResponse` is not used: it throws on web (no native emitter), and this shell
  // is rendered there too. Everything below is native-only.
  useEffect(() => {
    if (!enabled || !pushSupported()) return;
    let cancelled = false;
    Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (!cancelled) openFromResponse(last);
      })
      .catch((err: unknown) => logger.warn("[push] last notification response unavailable", err instanceof Error ? err.name : "unknown"));
    const sub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabled]);
}
