import { z } from "zod";

// ============================================================================
// Media gallery — mirror of next-boilerplate media_gallery
// (modules/media_gallery/server/media_gallery.types.ts + media_gallery.dto.ts).
// Dates arrive as ISO strings over JSON and stay strings here.
// ============================================================================

export const GalleryItemSchema = z.object({
  itemId: z.string(),
  galleryId: z.string(),
  tenantId: z.string().optional(),
  uploadedFileId: z.string().nullable(),
  externalUrl: z.string().nullish(),
  altText: z.string().nullish(),
  title: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  sortOrder: z.number().int(),
  isPrimary: z.boolean(),
  createdAt: z.string().optional(),
  /** Resolved server-side from the stored file (or the external URL). */
  url: z.string(),
  mimeType: z.string().nullish(),
  isVideo: z.boolean().optional(),
});
export type GalleryItem = z.infer<typeof GalleryItemSchema>;

export const GallerySchema = z.object({
  galleryId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  items: z.array(GalleryItemSchema),
});
export type Gallery = z.infer<typeof GallerySchema>;

/** GET /media-gallery/{entityType}/{entityId}/items → `{ gallery }` (created on first read). */
export const GalleryResponseSchema = z.object({ gallery: GallerySchema });

/** POST …/items → 201 `{ item }`; PUT /media-gallery/items/{itemId} → `{ item }`. */
export const GalleryItemResponseSchema = z.object({ item: GalleryItemSchema });

/** AddGalleryItemDTO. `uploadedFileId` is the id POST /storage returned. */
export const AddGalleryItemRequestSchema = z.object({
  uploadedFileId: z.string().min(1),
  altText: z.string().max(300).optional(),
  title: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(30).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isPrimary: z.boolean().optional(),
});
export type AddGalleryItemRequest = z.infer<typeof AddGalleryItemRequestSchema>;

/** UpdateGalleryItemDTO (all optional). */
export const UpdateGalleryItemRequestSchema = z.object({
  altText: z.string().max(300).optional(),
  title: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(30).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isPrimary: z.boolean().optional(),
});
export type UpdateGalleryItemRequest = z.infer<typeof UpdateGalleryItemRequestSchema>;

/** PUT …/items/reorder body: the gallery plus every item id in the wanted order. */
export const ReorderGalleryRequestSchema = z.object({
  galleryId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderGalleryRequest = z.infer<typeof ReorderGalleryRequestSchema>;
