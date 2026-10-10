import axiosInstance from "@/libs/axios";
import {
  AddGalleryItemRequestSchema,
  GalleryItemResponseSchema,
  GalleryResponseSchema,
  ReorderGalleryRequestSchema,
  UpdateGalleryItemRequestSchema,
  type AddGalleryItemRequest,
  type Gallery,
  type GalleryItem,
  type UpdateGalleryItemRequest,
} from "@/services/platform/mediaGallery.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

const itemsPath = (entityType: string, entityId: string) =>
  `/media-gallery/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/items`;

export class MediaGalleryClientService {
  /** The entity's gallery with its items (primary first, then by sort order). The server creates it when absent. */
  static async list(entityType: string, entityId: string): Promise<Gallery> {
    const res = await axiosInstance.get(itemsPath(entityType, entityId));
    return GalleryResponseSchema.parse(res.data).gallery;
  }

  /** Attaches an already uploaded file (POST /storage first) to the gallery. */
  static async addItem(entityType: string, entityId: string, payload: AddGalleryItemRequest): Promise<GalleryItem> {
    const body = AddGalleryItemRequestSchema.parse(payload);
    const res = await axiosInstance.post(itemsPath(entityType, entityId), body);
    return GalleryItemResponseSchema.parse(res.data).item;
  }

  static async updateItem(itemId: string, patch: UpdateGalleryItemRequest): Promise<GalleryItem> {
    const body = UpdateGalleryItemRequestSchema.parse(patch);
    const res = await axiosInstance.put(`/media-gallery/items/${encodeURIComponent(itemId)}`, body);
    return GalleryItemResponseSchema.parse(res.data).item;
  }

  /** The server clears the flag on every other item of the gallery. */
  static setPrimary(itemId: string): Promise<GalleryItem> {
    return MediaGalleryClientService.updateItem(itemId, { isPrimary: true });
  }

  static async removeItem(itemId: string): Promise<void> {
    await axiosInstance.delete(`/media-gallery/items/${encodeURIComponent(itemId)}`);
  }

  /** `orderedIds` becomes the new sort order (index = position); ids not listed keep theirs. */
  static async reorder(entityType: string, entityId: string, galleryId: string, orderedIds: string[]): Promise<void> {
    const body = ReorderGalleryRequestSchema.parse({ galleryId, orderedIds });
    await axiosInstance.put(`${itemsPath(entityType, entityId)}/reorder`, body);
  }
}
