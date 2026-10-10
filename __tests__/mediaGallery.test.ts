import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { pickAvatarImage, pickImage } from "@/libs/pickImage";
import { MediaGalleryClientService } from "@/services/platform/mediaGallery.service.client";
import type { GalleryItem } from "@/services/platform/mediaGallery.dto";
import { canMove, moveItem, sortGalleryItems, withPositions, withPrimary } from "@/utils/mediaGallery";
import { fail, mockRoute, signIn } from "./_helpers";
import { TENANT_ID } from "./fixtures";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const GALLERY_ID = uuid(900);

const item = (n: number, extra: Partial<GalleryItem> = {}): GalleryItem => ({
  itemId: uuid(n),
  galleryId: GALLERY_ID,
  uploadedFileId: uuid(100 + n),
  sortOrder: n,
  isPrimary: false,
  url: `https://cdn.test/${n}.jpg`,
  ...extra,
});

// What the server sends: dates as ISO strings, nullable overlay fields.
const wire = (n: number, extra: Record<string, unknown> = {}) => ({
  ...item(n),
  tenantId: TENANT_ID,
  externalUrl: null,
  altText: null,
  title: null,
  tags: null,
  contentHash: "abc",
  createdAt: "2026-10-10T10:00:00.000Z",
  mimeType: "image/jpeg",
  isVideo: false,
  srcset: null,
  ...extra,
});

describe("MediaGalleryClientService", () => {
  beforeEach(() => signIn(TENANT_ID));

  it("lists the gallery of an entity and parses the server's item view", async () => {
    const seen = mockRoute("get", "/media-gallery/blog_post/e1/items", {
      gallery: { galleryId: GALLERY_ID, tenantId: TENANT_ID, entityType: "blog_post", entityId: "e1", createdAt: "2026-10-10T10:00:00.000Z", items: [wire(1, { isPrimary: true }), wire(2)] },
    });
    const gallery = await MediaGalleryClientService.list("blog_post", "e1");
    expect(seen[0].tenantId).toBe(TENANT_ID);
    expect(gallery.galleryId).toBe(GALLERY_ID);
    expect(gallery.items.map((i) => i.itemId)).toEqual([uuid(1), uuid(2)]);
    expect(gallery.items[0].isPrimary).toBe(true);
  });

  it("escapes the entity path segments", async () => {
    const seen = mockRoute("get", "/media-gallery/blog_post/a%2Fb/items", { gallery: { galleryId: GALLERY_ID, entityType: "blog_post", entityId: "a/b", items: [] } });
    await MediaGalleryClientService.list("blog_post", "a/b");
    expect(seen).toHaveLength(1);
  });

  it("attaches an uploaded file and returns the created item", async () => {
    const seen = mockRoute("post", "/media-gallery/blog_post/e1/items", () => ({ body: { item: wire(3) }, init: { status: 201 } }));
    const created = await MediaGalleryClientService.addItem("blog_post", "e1", { uploadedFileId: uuid(103), sortOrder: 2 });
    expect(seen[0].body).toEqual({ uploadedFileId: uuid(103), sortOrder: 2 });
    expect(created.itemId).toBe(uuid(3));
  });

  it("does not send an add without an uploaded file id", async () => {
    const seen = mockRoute("post", "/media-gallery/blog_post/e1/items", { item: wire(3) });
    await expect(MediaGalleryClientService.addItem("blog_post", "e1", { uploadedFileId: "" })).rejects.toThrow();
    expect(seen).toHaveLength(0);
  });

  it("sets the primary item with an isPrimary update", async () => {
    const seen = mockRoute("put", `/media-gallery/items/${uuid(2)}`, { item: wire(2, { isPrimary: true }) });
    const updated = await MediaGalleryClientService.setPrimary(uuid(2));
    expect(seen[0].body).toEqual({ isPrimary: true });
    expect(updated.isPrimary).toBe(true);
  });

  it("deletes an item", async () => {
    const seen = mockRoute("delete", `/media-gallery/items/${uuid(2)}`, { success: true });
    await MediaGalleryClientService.removeItem(uuid(2));
    expect(seen[0].method).toBe("DELETE");
  });

  it("reorders with the gallery id and the ids in order", async () => {
    const seen = mockRoute("put", "/media-gallery/blog_post/e1/items/reorder", { success: true });
    await MediaGalleryClientService.reorder("blog_post", "e1", GALLERY_ID, [uuid(2), uuid(1)]);
    expect(seen[0].body).toEqual({ galleryId: GALLERY_ID, orderedIds: [uuid(2), uuid(1)] });
  });

  it("does not send an empty reorder", async () => {
    const seen = mockRoute("put", "/media-gallery/blog_post/e1/items/reorder", { success: true });
    await expect(MediaGalleryClientService.reorder("blog_post", "e1", GALLERY_ID, [])).rejects.toThrow();
    expect(seen).toHaveLength(0);
  });

  it("surfaces a server rejection", async () => {
    mockRoute("post", "/media-gallery/blog_post/e1/items", () => fail(422, { message: "This gallery has reached its maximum number of items" }));
    await expect(MediaGalleryClientService.addItem("blog_post", "e1", { uploadedFileId: uuid(103) })).rejects.toBeDefined();
  });
});

describe("gallery ordering helpers", () => {
  const list = [item(1, { isPrimary: true, sortOrder: 5 }), item(2, { sortOrder: 0 }), item(3, { sortOrder: 1 }), item(4, { sortOrder: 2 })];

  it("sorts primary first, then by sort order", () => {
    expect(sortGalleryItems([list[3], list[2], list[0], list[1]]).map((i) => i.itemId)).toEqual([uuid(1), uuid(2), uuid(3), uuid(4)]);
  });

  it("swaps neighbours", () => {
    expect(moveItem(list, uuid(4), -1).map((i) => i.itemId)).toEqual([uuid(1), uuid(2), uuid(4), uuid(3)]);
    expect(moveItem(list, uuid(2), 1).map((i) => i.itemId)).toEqual([uuid(1), uuid(3), uuid(2), uuid(4)]);
  });

  it("never moves anything across the primary item or past the ends", () => {
    expect(canMove(list, uuid(2), -1)).toBe(false);
    expect(canMove(list, uuid(1), 1)).toBe(false);
    expect(canMove(list, uuid(4), 1)).toBe(false);
    expect(moveItem(list, "missing", 1)).toBe(list);
  });

  it("renumbers sort orders by position", () => {
    expect(withPositions(moveItem(list, uuid(4), -1)).map((i) => i.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it("moves the primary flag to one item and lists it first", () => {
    const next = withPrimary(list, uuid(3));
    expect(next.map((i) => i.itemId)[0]).toBe(uuid(3));
    expect(next.filter((i) => i.isPrimary)).toHaveLength(1);
  });
});

describe("pickImage", () => {
  const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
  const manipulate = ImageManipulator.manipulateAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///cache/raw.jpg" }] } as never);
    manipulate.mockResolvedValue({ uri: "file:///cache/out.jpg" });
  });

  it("avatar: square crop, 512 px wide, avatar-named JPEG (unchanged behaviour)", async () => {
    const res = await pickAvatarImage("library");
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
    expect(manipulate.mock.calls[0][1]).toEqual([{ resize: { width: 512 } }]);
    expect(res.status).toBe("picked");
    if (res.status === "picked") {
      expect(res.file).toMatchObject({ uri: "file:///cache/out.jpg", type: "image/jpeg" });
      expect(res.file.name).toMatch(/^avatar-\d+\.jpg$/);
    }
  });

  it("gallery options: no crop, wider output, own file name", async () => {
    const res = await pickImage("library", { crop: false, widthPx: 1600, namePrefix: "gallery" });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
    expect(manipulate.mock.calls[0][1]).toEqual([{ resize: { width: 1600 } }]);
    expect(res.status === "picked" && res.file.name).toMatch(/^gallery-\d+\.jpg$/);
  });

  it("reports a refused permission and a cancelled pick without touching the file", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    expect(await pickImage("camera")).toEqual({ status: "denied" });
    picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: null } as never);
    expect(await pickImage("library")).toEqual({ status: "cancelled" });
    expect(manipulate).not.toHaveBeenCalled();
  });
});
