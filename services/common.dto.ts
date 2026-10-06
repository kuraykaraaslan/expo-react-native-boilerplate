import { z } from "zod";
import { normalizeApiError } from "@/libs/apiError";

// ── Pagination ────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  total: z.number(),
  hasNext: z.boolean().default(false),
});
export type Pagination = z.infer<typeof PaginationSchema>;

// ── API Error ─────────────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  statusCode: z.number().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ── Generic Paginated Response ────────────────────────────────────────────────

export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasNext: z.boolean(),
  });
}

// ── Error Utility ─────────────────────────────────────────────────────────────

/** User-facing message for any thrown value — see libs/apiError.ts for the server's error shapes. */
export function extractErrorMessage(err: unknown): string {
  return normalizeApiError(err).message;
}
