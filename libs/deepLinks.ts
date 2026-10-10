// ============================================================================
// Incoming deep links (phase 6 + phase 7).
//
// Three shapes reach the app:
//   - the e-mailed invitation links of next-boilerplate (`tenant_invitation.notify.ts`):
//       https://<host>/auth/invitation/(accept|decline)?token=...                 domain tenancy
//       https://<host>/t/<tenantId>/auth/invitation/(accept|decline)?token=...    path tenancy
//       https://<host>/tenant/<tenantId>/auth/invitation/(accept|decline)?token=... fallback without a domain
//   - the SSO return `<scheme>://auth/callback?...` (also delivered to the router on Android
//     while openAuthSessionAsync is waiting for it)
//   - anything else (left to Expo Router untouched)
//
// The invitation `token` is deliberately dropped here: the app answers invitations BY ID from
// GET /auth/me/tenants (libs/invitations.ts), which needs the signed-in account's verified email -
// the same requirement the token route has - so the secret never enters router state or logs.
// ============================================================================

export type InvitationAction = "accept" | "decline";
export type InvitationLink = { tenantId: string | null; action: InvitationAction };

const INVITATION_PATH = /^(?:\/(?:t|tenant)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?\/auth\/invitation\/(accept|decline)$/i;
const SSO_CALLBACK_PATH = "/auth/callback";

/** The path of an incoming URL or router path, without origin, query or fragment: `/a/b` (no trailing slash). */
export function pathOf(raw: string): string {
  const url = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/i.exec(raw);
  let path: string;
  if (url) {
    const web = /^https?$/i.test(url[1]);
    // A custom-scheme URL has no host: `app://auth/callback` carries `auth` as its first segment.
    // Expo Go (`exp://host:8081/--/auth/callback`) puts the app path after `/--`.
    path = web ? url[3] : /^exps?$/i.test(url[1]) ? url[3].replace(/^\/--(?=\/|$)/, "") : `/${url[2]}${url[3]}`;
  } else {
    path = raw.split(/[?#]/)[0];
  }
  path = `/${path}`.replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

/** Recognises an invitation accept/decline link (see the shapes above). */
export function parseInvitationLink(raw: string): InvitationLink | null {
  const match = INVITATION_PATH.exec(pathOf(raw));
  if (!match) return null;
  return { tenantId: match[1]?.toLowerCase() ?? null, action: match[2].toLowerCase() as InvitationAction };
}

export function isSsoCallback(raw: string): boolean {
  return pathOf(raw) === SSO_CALLBACK_PATH;
}

/** Route params of the invitation screen: only what is not secret. */
export function invitationParams(link: InvitationLink): { action: InvitationAction; tenantId?: string } {
  return link.tenantId ? { action: link.action, tenantId: link.tenantId } : { action: link.action };
}

/** The same route as a path string (for the native-intent rewrite). */
export function invitationRoute(link: InvitationLink): string {
  return `/invitation?${new URLSearchParams(invitationParams(link)).toString()}`;
}

/**
 * Rewrites an incoming system URL to the route the app should open (used by app/+native-intent.tsx).
 * The SSO callback has no screen: the awaiting `openAuthSessionAsync` consumes it, so the router is
 * simply kept at the app root instead of landing on +not-found with tokens in the URL.
 */
export function mapIncomingPath(raw: string): string {
  const invitation = parseInvitationLink(raw);
  if (invitation) return invitationRoute(invitation);
  if (isSsoCallback(raw)) return "/";
  return raw;
}
