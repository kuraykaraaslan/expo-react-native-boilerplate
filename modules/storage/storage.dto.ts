import { z } from "zod";

// ============================================================================
// Storage — mirror of next-boilerplate storage.
// POST /storage takes multipart form data (`file`, optional `folder`, optional
// `provider`), is open to any signed-in user (`storage.files.upload`, scope
// ACCOUNT) and validates the MIME type from the file's content. The size and
// type limits are per-tenant settings the API does not expose, so the app only
// pre-checks sanity limits and shows the server's own message otherwise.
// ============================================================================

/** POST /storage → 200 `{ message, uploadedFileId, url, key, bucket, size, provider }`. */
export const UploadResponseSchema = z.object({
  message: z.string().optional(),
  uploadedFileId: z.string(),
  url: z.string(),
  key: z.string().nullish(),
  bucket: z.string().nullish(),
  size: z.number().nullish(),
  provider: z.string().nullish(),
});
export type UploadResponse = z.infer<typeof UploadResponseSchema>;

/** What the pickers hand over: a local file reference. */
export type LocalFile = { uri: string; name: string; type: string };
