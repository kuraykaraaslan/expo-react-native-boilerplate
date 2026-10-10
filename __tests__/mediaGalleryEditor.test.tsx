import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { MediaGalleryEditor } from "@/components/media/MediaGalleryEditor";
import { MediaGalleryClientService } from "@/services/platform/mediaGallery.service.client";
import type { Gallery, GalleryItem } from "@/services/platform/mediaGallery.dto";
import { useTenantStore } from "@/stores/tenantStore";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: "success", Error: "error" },
}));
jest.mock("@fortawesome/react-native-fontawesome", () => ({ FontAwesomeIcon: () => null }));
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("@/libs/pickImage", () => ({ pickImage: jest.fn() }));
jest.mock("@/services/platform/mediaGallery.service.client");

const service = MediaGalleryClientService as jest.Mocked<typeof MediaGalleryClientService>;

const item = (id: string, sortOrder: number, extra: Partial<GalleryItem> = {}): GalleryItem => ({
  itemId: id,
  galleryId: "g1",
  uploadedFileId: `f-${id}`,
  sortOrder,
  isPrimary: false,
  url: `https://cdn.test/${id}.jpg`,
  ...extra,
});
const gallery = (...items: GalleryItem[]): Gallery => ({ galleryId: "g1", entityType: "blog_post", entityId: "e1", items });

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

describe("MediaGalleryEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTenantStore.setState({ activeTenantId: "t1" });
  });

  it("drops a list answer that arrives after the organization changed", async () => {
    const first = deferred<Gallery>();
    service.list.mockReturnValueOnce(first.promise).mockResolvedValueOnce(gallery(item("b1", 0)));
    await render(<MediaGalleryEditor entityType="blog_post" entityId="e1" />);

    await act(async () => useTenantStore.setState({ activeTenantId: "t2" }));
    await waitFor(() => expect(screen.getByTestId("gallery-item-b1")).toBeTruthy());

    await act(async () => first.resolve(gallery(item("a1", 0))));
    expect(screen.queryByTestId("gallery-item-a1")).toBeNull();
    expect(screen.getByTestId("gallery-item-b1")).toBeTruthy();
  });

  it("does not put the old organization's photos back when a reorder fails after a switch", async () => {
    const reorder = deferred<void>();
    service.list.mockResolvedValueOnce(gallery(item("a1", 0), item("a2", 1))).mockResolvedValueOnce(gallery(item("b1", 0)));
    service.reorder.mockReturnValueOnce(reorder.promise);
    await render(<MediaGalleryEditor entityType="blog_post" entityId="e1" />);
    await waitFor(() => expect(screen.getByTestId("gallery-item-a2")).toBeTruthy());

    await fireEvent.press(screen.getByTestId("gallery-earlier-a2"));
    await waitFor(() => expect(service.reorder).toHaveBeenCalledTimes(1));

    await act(async () => useTenantStore.setState({ activeTenantId: "t2" }));
    await waitFor(() => expect(screen.getByTestId("gallery-item-b1")).toBeTruthy());

    await act(async () => reorder.reject(new Error("refused")));
    expect(screen.queryByTestId("gallery-item-a1")).toBeNull();
    expect(screen.queryByTestId("gallery-item-a2")).toBeNull();
    expect(screen.getByTestId("gallery-item-b1")).toBeTruthy();
  });

  it("hides the controls when read only", async () => {
    service.list.mockResolvedValueOnce(gallery(item("a1", 0)));
    await render(<MediaGalleryEditor entityType="blog_post" entityId="e1" readOnly />);
    await waitFor(() => expect(screen.getByTestId("gallery-item-a1")).toBeTruthy());
    expect(screen.queryByTestId("gallery-delete-a1")).toBeNull();
    expect(screen.queryByTestId("gallery-library")).toBeNull();
  });
});
