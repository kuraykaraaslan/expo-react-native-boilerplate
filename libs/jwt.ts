// ============================================================================
// JWT payload reading — NOT verification.
// The device access token is a signed JWT whose payload carries the session
// the token belongs to. The app only needs to read that id (to revoke its own
// session on sign-out); trust always stays with the server, which verifies the
// signature on every request.
// ============================================================================

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  // The payload is UTF-8; atob yields one char per byte.
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segment = token.split(".")[1];
  if (!segment) return null;
  try {
    const payload: unknown = JSON.parse(decodeBase64Url(segment));
    return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** `userSessionId` claim of a device access token, or null if it is not readable. */
export function getSessionIdFromToken(token: string): string | null {
  const id = decodeJwtPayload(token)?.userSessionId;
  return typeof id === "string" && id.length > 0 ? id : null;
}
