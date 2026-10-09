import { z } from "zod";

// ============================================================================
// Storage — mirror of next-boilerplate storage (POST /storage, GET /storage/usage).
// ============================================================================

/** POST /storage → the stored file; `url` is what other records (profilePicture) reference. */
export const UploadResponseSchema = z.object({
  message: z.string().optional(),
  uploadedFileId: z.string().nullish(),
  url: z.string(),
  key: z.string().nullish(),
  bucket: z.string().nullish(),
  size: z.number().nullish(),
  provider: z.string().nullish(),
});
export type UploadResponse = z.infer<typeof UploadResponseSchema>;

/** GET /storage/usage. Quota / remaining are -1 when the plan is unlimited. */
export const StorageUsageSchema = z.object({
  usedBytes: z.number(),
  quotaBytes: z.number(),
  remainingBytes: z.number(),
});
export type StorageUsage = z.infer<typeof StorageUsageSchema>;
