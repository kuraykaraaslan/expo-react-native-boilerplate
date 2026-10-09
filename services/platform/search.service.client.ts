import axiosInstance from "@/libs/axios";
import {
  SavedSearchCreateResponseSchema,
  SavedSearchListResponseSchema,
  SaveSearchRequestSchema,
  SearchHistoryResponseSchema,
  SearchResponseSchema,
  type SavedSearch,
  type SaveSearchRequest,
  type SearchHistoryEntry,
  type SearchResponse,
} from "@/services/platform/search.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export const SEARCH_PAGE_SIZE = 20;

export class SearchClientService {
  /** The server rejects an empty or 200+ character query; the caller trims first. */
  static async search(q: string, opts: { entityType?: string; offset?: number; limit?: number; signal?: AbortSignal } = {}): Promise<SearchResponse> {
    const res = await axiosInstance.get("/search", {
      params: { q, entityType: opts.entityType, limit: opts.limit ?? SEARCH_PAGE_SIZE, offset: opts.offset ?? 0 },
      signal: opts.signal,
    });
    return SearchResponseSchema.parse(res.data);
  }

  static async getHistory(limit = 10): Promise<SearchHistoryEntry[]> {
    const res = await axiosInstance.get("/search/history", { params: { limit } });
    return SearchHistoryResponseSchema.parse(res.data).data;
  }

  static async clearHistory(): Promise<void> {
    await axiosInstance.delete("/search/history");
  }

  static async getSaved(): Promise<SavedSearch[]> {
    const res = await axiosInstance.get("/search/saved");
    return SavedSearchListResponseSchema.parse(res.data).data;
  }

  static async save(payload: SaveSearchRequest): Promise<SavedSearch> {
    const body = SaveSearchRequestSchema.parse(payload);
    const res = await axiosInstance.post("/search/saved", body);
    return SavedSearchCreateResponseSchema.parse(res.data).item;
  }

  static async deleteSaved(savedSearchId: string): Promise<void> {
    await axiosInstance.delete(`/search/saved/${encodeURIComponent(savedSearchId)}`);
  }
}
