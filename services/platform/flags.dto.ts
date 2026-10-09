import { z } from "zod";

// ============================================================================
// Feature flags — mirror of next-boilerplate feature_flags.
// POST /feature-flags/evaluate without a `key` answers `{ flags: { [key]: boolean } }`
// for the caller (the server defaults the subject to the caller's userId).
// ============================================================================

export const EvaluateAllFlagsResponseSchema = z.object({
  flags: z.record(z.string(), z.boolean()),
});
export type EvaluateAllFlagsResponse = z.infer<typeof EvaluateAllFlagsResponseSchema>;

export type FlagMap = Record<string, boolean>;
