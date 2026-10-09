import { z } from "zod";

// ============================================================================
// Search — mirror of next-boilerplate search.
// GET /search?q&entityType&limit&offset → `{ hits, total }`. Hits are already
// filtered for the caller's visibility by the server. `url` is a WEB location,
// never an app route; `snippet` is a ts_headline fragment with <b>…</b> marks.
// ============================================================================

export const SearchHitSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  title: z.string(),
  url: z.string().nullish(),
  snippet: z.string().default(""),
  rank: z.number().default(0),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});
export type SearchHit = z.infer<typeof SearchHitSchema>;

export const SearchResponseSchema = z.object({ hits: z.array(SearchHitSchema), total: z.number().default(0) });
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

/** GET /search/history → `{ data }`, newest first. */
export const SearchHistoryEntrySchema = z.object({
  searchQueryLogId: z.string(),
  query: z.string(),
  entityType: z.string().nullish(),
  resultCount: z.number().default(0),
  createdAt: z.string(),
});
export type SearchHistoryEntry = z.infer<typeof SearchHistoryEntrySchema>;
export const SearchHistoryResponseSchema = z.object({ data: z.array(SearchHistoryEntrySchema) });

/** GET /search/saved → `{ data }`; POST → 201 `{ item }`. */
export const SavedSearchSchema = z.object({
  savedSearchId: z.string(),
  name: z.string(),
  query: z.string(),
  entityType: z.string().nullish(),
  createdAt: z.string().nullish(),
});
export type SavedSearch = z.infer<typeof SavedSearchSchema>;
export const SavedSearchListResponseSchema = z.object({ data: z.array(SavedSearchSchema) });
export const SavedSearchCreateResponseSchema = z.object({ item: SavedSearchSchema });

export const SaveSearchRequestSchema = z.object({
  name: z.string().min(1).max(120),
  query: z.string().min(1).max(200),
  entityType: z.string().max(64).optional(),
});
export type SaveSearchRequest = z.infer<typeof SaveSearchRequestSchema>;
