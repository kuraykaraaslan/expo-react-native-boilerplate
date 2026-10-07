import type { Session } from "@/services/auth/auth.dto";

export type SessionDescription = {
  /** "Pixel 8 · Android" from the device metadata, else a user-agent guess; null when neither says anything. */
  name: string | null;
  /** "Istanbul, Türkiye" from the geo metadata. */
  location: string | null;
  mobile: boolean;
};

/** Best-effort device name from a user agent: "Chrome · Windows", "App · iPhone". */
function describeUserAgent(ua?: string | null): { name: string | null; mobile: boolean } {
  if (!ua) return { name: null, mobile: false };
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : null;
  const app = /Expo/.test(ua) ? "App" : /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : null;
  return { name: [app, os].filter(Boolean).join(" · ") || null, mobile: os === "iOS" || os === "Android" };
}

/**
 * What to show for a session row. The app's own sessions carry `metadata.device`
 * (sent at device login); browser sessions only have a user agent.
 */
export function describeSession(session: Pick<Session, "userAgent" | "metadata">): SessionDescription {
  const device = session.metadata?.device;
  const geo = session.metadata?.geo;
  const fromAgent = describeUserAgent(session.userAgent);

  const hardware = device?.name?.trim() || [device?.brand, device?.model].filter(Boolean).join(" ").trim();
  const name = hardware ? [hardware, device?.os].filter(Boolean).join(" · ") : fromAgent.name;
  const mobile = device?.type ? device.type === "phone" || device.type === "tablet" : fromAgent.mobile;
  const location = [geo?.city, geo?.country].filter(Boolean).join(", ") || null;

  return { name, location, mobile };
}
