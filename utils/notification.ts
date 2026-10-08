import type { Notification } from "@/services/user/notification.dto";

/**
 * A web link that is safe to hand to the in-app browser: an absolute URL, or a path resolved
 * against `baseUrl`, and only http(s) — never javascript:, file:, intent: … Returns null otherwise.
 */
export function safeWebUrl(raw: string | null | undefined, baseUrl: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Where tapping a notification should go. The server's `action.url` / `path` are
 * **web** locations (an absolute URL or an admin path such as "/admin/invoices"),
 * not app routes, so the target is always opened in the in-app browser.
 * Returns null when there is nothing safe to open.
 */
export function notificationTarget(n: Pick<Notification, "action" | "path">, frontendUrl: string): string | null {
  return safeWebUrl(n.action?.url || n.path, frontendUrl);
}
