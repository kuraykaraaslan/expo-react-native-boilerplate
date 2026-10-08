<!--
ORDER OF AUTHORITY (the higher item wins on conflict):
  1. AGENTS.md (§6 Hard rules · §5 file naming · §0 catalog sync)
  2. next-boilerplate contract — READ-ONLY reference:
     modules/search/{module.json,server/*} · modules/navigation/{module.json,server/*}
  3. phases/README.md
  4. phases/platform/README.md (P1)
  5. THIS FILE
ONLY EXCEPTION: "Owner decisions (fixed)" — a recorded owner decision overrides this file's proposal.
WHERE WE ARE: phases/README.md §Order
-->

# Phase 17 — Global search (and a navigation decision)

**Goal:** A user can search across the tenant's indexed content from the app, reuse past and saved searches, and open a result in the right screen.

Modules: `search`, `navigation`. Priority 2.

## 17.1 Contract check

- [ ] `search`: `GET /search` (query, filters, pagination), `GET/POST /search/saved`, `DELETE /search/saved/[id]`, `GET /search/history`. Documents are `title/body/url/metadata` keyed by `entityType + entityId`; read the response and how `url` is shaped (a **web URL**, not an app route).
- [ ] `navigation` models **site header/footer menus** with nested items. Decide whether it is useful in the app at all: it is likely a public-website concern, not drawer navigation. If it is, define how a menu item maps to a route; if not, record "not applicable" here and close this half.

## 17.2 Search

- [ ] `services/platform/search.{dto,service.client}.ts` (K6).
- [ ] `app/(drawer)/search.tsx`: debounced input, recent history, saved searches, grouped results by `entityType`, empty and error states, pagination on scroll.
- [ ] **Result routing:** a `libs/searchRoutes.ts` map from `entityType` (+ id) to app routes; unknown types open the web `url` in `expo-web-browser`. Tenant members, notifications and messages (when those phases ship) are the first local targets.
- [ ] Search entry in the top bar; respects the active tenant only.

## Files touched / created

- New: `services/platform/search.*`, `app/(drawer)/search.tsx`, `libs/searchRoutes.ts`
- Changed: top bar, drawer layout, `locales/*.json`
- Test: debounce, pagination, result routing incl. unknown type fallback

## Reuse

- `@/components/ui` `Input`, `Card`, `EmptyState`, `Spinner`; Phase 7 / 9 / 16 detail screens as route targets.

## Acceptance criteria

- Typing returns tenant-scoped results; switching tenants clears results and history views.
- Tapping a result opens an in-app screen when the type is known and the web page otherwise.
- Saved searches round-trip with the web admin.
- `npm run registry:snapshot` is up to date.

## Risks

- **Web URLs in results** leaving the app unexpectedly; the fallback is explicit and uses the in-app browser sheet.
- **Result privacy.** The server filters by permission; the client must not cache results across tenants or sign-outs (clear on `flush()`).
- **Request volume.** Debounce and cancel in-flight requests; the route is rate limited.
