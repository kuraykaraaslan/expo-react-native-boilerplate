// ============================================================================
// Upload sanity checks. The real limits (size, allowed types) are per-tenant
// server settings the API does not expose, so the app only refuses what can
// never be right and lets the server's own message explain the rest.
// ============================================================================

/**
 * Largest source image the app will start working on. A photo is resized to a few hundred KB
 * before upload, so this only stops absurd inputs (e.g. a raw video) from being decoded.
 */
export const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;

export type ImageCheck = "NOT_IMAGE" | "TOO_LARGE" | null;

/** `null` when the picked asset may proceed; otherwise why not. Unknown size/type are given the benefit of the doubt. */
export function checkImage(asset: { mimeType?: string | null; fileSize?: number | null }): ImageCheck {
  if (asset.mimeType && !asset.mimeType.toLowerCase().startsWith("image/")) return "NOT_IMAGE";
  if (typeof asset.fileSize === "number" && asset.fileSize > MAX_SOURCE_IMAGE_BYTES) return "TOO_LARGE";
  return null;
}

/** A unique, extension-correct file name for an uploaded avatar (the server derives the stored key from it). */
export function avatarFileName(now: number = Date.now()): string {
  return `avatar-${now}.jpg`;
}
