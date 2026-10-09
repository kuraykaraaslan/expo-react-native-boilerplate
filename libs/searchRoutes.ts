import type { Href } from "expo-router";
import { safeWebUrl } from "@/utils/notification";
import type { SearchHit } from "@/services/platform/search.dto";

// ============================================================================
// Where a search hit opens. The server's `url` is a web location, so the safe
// default is the in-app browser. A hit whose entity type has a screen in this
// app opens that screen instead; add the type here when its screen ships.
// None of the types the server indexes today (pages, blog, CRM leads, support,
// orders, catalog, contacts, HR, messaging) has an app screen yet.
// ============================================================================

export type SearchTarget = { kind: "route"; href: Href } | { kind: "web"; url: string } | { kind: "none" };

const ROUTES: Record<string, (hit: SearchHit) => Href | null> = {
  // e.g. MESSAGING_CONVERSATION: (hit) => `/messages/${hit.entityId}` once Phase 16 ships.
};

export function searchTarget(hit: Pick<SearchHit, "entityType" | "entityId" | "url" | "metadata">, frontendUrl: string): SearchTarget {
  const href = ROUTES[hit.entityType]?.(hit as SearchHit);
  if (href) return { kind: "route", href };
  const url = safeWebUrl(hit.url, frontendUrl);
  return url ? { kind: "web", url } : { kind: "none" };
}
