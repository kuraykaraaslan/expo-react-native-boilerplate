import type { GalleryItem } from "@/services/platform/mediaGallery.dto";

// ============================================================================
// Pure helpers for the gallery editor. The server lists the primary item first,
// then by sort order; these keep the local copy in the same order.
// ============================================================================

/** Primary first, then ascending sort order; ties keep the incoming order. */
export function sortGalleryItems(items: GalleryItem[]): GalleryItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(b.item.isPrimary) - Number(a.item.isPrimary) || a.item.sortOrder - b.item.sortOrder || a.index - b.index)
    .map(({ item }) => item);
}

/**
 * Swaps an item with its neighbour. The primary item stays first (the server
 * lists it first whatever its sort order is), so nothing moves across it.
 * Returns the same array when the move is not possible.
 */
export function moveItem(items: GalleryItem[], itemId: string, direction: -1 | 1): GalleryItem[] {
  const from = items.findIndex((i) => i.itemId === itemId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= items.length) return items;
  if (items[from].isPrimary || items[to].isPrimary) return items;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function canMove(items: GalleryItem[], itemId: string, direction: -1 | 1): boolean {
  return moveItem(items, itemId, direction) !== items;
}

/** Sort orders renumbered to match the list position, as the server does on reorder. */
export function withPositions(items: GalleryItem[]): GalleryItem[] {
  return items.map((item, index) => (item.sortOrder === index ? item : { ...item, sortOrder: index }));
}

/** Flags one item primary and clears the rest (the server does the same). */
export function withPrimary(items: GalleryItem[], itemId: string): GalleryItem[] {
  return sortGalleryItems(items.map((item) => ({ ...item, isPrimary: item.itemId === itemId })));
}
