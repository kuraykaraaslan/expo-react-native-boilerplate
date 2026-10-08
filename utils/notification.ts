import type { Notification } from "@/services/user/notification.dto";

/**
 * Where tapping a notification should go. The server's `action.url` / `path` are
 * **web** locations (an absolute URL or an admin path such as "/admin/invoices"),
 * not app routes, so the target is always opened in the in-app browser.
 * Returns null when there is nothing safe to open.
 */
export function notificationTarget(n: Pick<Notification, "action" | "path">, frontendUrl: string): string | null {
  const raw = (n.action?.url || n.path || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw, frontendUrl.endsWith("/") ? frontendUrl : `${frontendUrl}/`);
    // Only web links: never hand javascript:, file:, intent: … to the system.
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
