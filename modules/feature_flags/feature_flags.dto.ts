import { z } from "zod";

// ============================================================================
// Feature flags — mirror of next-boilerplate feature_flags.
// POST /feature-flags/evaluate (any signed-in member; the caller's own user id is
// the default subject) with no `key` answers every flag of the tenant at once:
// `{ flags: { "<key>": boolean } }`. Flag keys are lowercase slugs.
// ============================================================================

export const EvaluateAllFlagsResponseSchema = z.object({
  flags: z.record(z.boolean()).default({}),
});
export type FlagMap = z.infer<typeof EvaluateAllFlagsResponseSchema>["flags"];
