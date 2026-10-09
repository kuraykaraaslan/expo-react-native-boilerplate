import { isPlanGateError } from "@/libs/apiError";

// ============================================================================
// Upload helpers — pre-checks and the multipart body for POST /storage.
// The server (storage.validation) re-checks size, extension and magic bytes;
// this only rejects the obvious before spending the user's mobile data.
// ============================================================================

/** Local file as the pickers hand it over. */
export type UploadFile = { uri: string; name: string; type: string; size?: number | null };

/** Conservative default; the real limit is a tenant setting the client cannot read. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type UploadRejection = "EMPTY" | "TOO_LARGE" | "TYPE_NOT_ALLOWED";

export type UploadPolicy = { maxBytes?: number; mimeTypes?: readonly string[] };

/** `null` when the file may be uploaded, otherwise why not. */
export function checkUpload(file: Pick<UploadFile, "type" | "size">, policy: UploadPolicy = {}): UploadRejection | null {
  const { maxBytes = MAX_UPLOAD_BYTES, mimeTypes } = policy;
  if (file.size === 0) return "EMPTY";
  if (file.size != null && file.size > maxBytes) return "TOO_LARGE";
  if (mimeTypes && !mimeTypes.includes(file.type.toLowerCase())) return "TYPE_NOT_ALLOWED";
  return null;
}

/**
 * Multipart body: `file` (+ `folder`). React Native's FormData reads `{ uri, name, type }`
 * and streams the file from disk; the server derives the real MIME from the content.
 */
export function buildUploadForm(file: UploadFile, folder = "general"): FormData {
  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  form.append("folder", folder);
  return form;
}

/** True when the failure was the plan (storage quota / feature), so the screen can offer an upgrade. */
export const isUploadBlockedByPlan = isPlanGateError;
