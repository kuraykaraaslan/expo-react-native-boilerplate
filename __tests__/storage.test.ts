import { http, HttpResponse } from "msw";
import { avatarFileName, checkImage, MAX_SOURCE_IMAGE_BYTES } from "@/libs/upload";
import { buildUploadForm, StorageClientService } from "@/modules/storage/storage.service.client";
import { signIn } from "./_helpers";
import { server } from "./_server";
import { TENANT_ID } from "./fixtures";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

describe("checkImage", () => {
  it("lets images through, including unknown type or size", () => {
    expect(checkImage({ mimeType: "image/jpeg", fileSize: 2_000_000 })).toBeNull();
    expect(checkImage({ mimeType: "IMAGE/PNG" })).toBeNull();
    expect(checkImage({})).toBeNull();
    expect(checkImage({ mimeType: null, fileSize: null })).toBeNull();
  });

  it("refuses non-images and absurdly large sources", () => {
    expect(checkImage({ mimeType: "video/mp4" })).toBe("NOT_IMAGE");
    expect(checkImage({ mimeType: "application/pdf" })).toBe("NOT_IMAGE");
    expect(checkImage({ mimeType: "image/jpeg", fileSize: MAX_SOURCE_IMAGE_BYTES + 1 })).toBe("TOO_LARGE");
    expect(checkImage({ fileSize: MAX_SOURCE_IMAGE_BYTES })).toBeNull(); // the limit itself is allowed
  });

  it("names avatars uniquely with a .jpg extension", () => {
    expect(avatarFileName(1700000000000)).toBe("avatar-1700000000000.jpg");
    expect(avatarFileName(1)).not.toBe(avatarFileName(2));
  });
});

describe("buildUploadForm", () => {
  it("puts the file and the folder in the form", async () => {
    const form = await buildUploadForm({ uri: "file:///cache/a.jpg", name: "a.jpg", type: "image/jpeg" }, "avatars");
    // Jest's FormData is the standard one; the React Native `{ uri, name, type }` part itself is only
    // meaningful on a device, so here we check that both fields are present.
    expect(form.get("folder")).toBe("avatars");
    expect(form.has("file")).toBe(true);
  });
});

describe("StorageClientService.upload", () => {
  beforeEach(() => signIn(TENANT_ID));

  it("posts multipart (not JSON) to the tenant-addressed /storage and parses the answer", async () => {
    let contentType: string | null = null;
    let path = "";
    server.use(
      http.post("*/api/tenant/:tenantId/storage", ({ request }) => {
        contentType = request.headers.get("content-type");
        path = new URL(request.url).pathname;
        return HttpResponse.json({
          message: "File uploaded successfully",
          uploadedFileId: "f-1",
          url: "https://cdn.example.com/avatars/avatar-1.jpg",
          key: "avatars/avatar-1.jpg",
          bucket: "b",
          size: 48211,
          provider: "S3",
        });
      }),
    );

    const res = await StorageClientService.upload({ uri: "file:///cache/a.jpg", name: "avatar-1.jpg", type: "image/jpeg" }, "avatars");

    expect(path).toBe(`/api/tenant/${TENANT_ID}/storage`);
    expect(contentType).toMatch(/^multipart\/form-data/);
    expect(contentType).not.toMatch(/json/);
    expect(res).toMatchObject({ uploadedFileId: "f-1", url: "https://cdn.example.com/avatars/avatar-1.jpg", size: 48211 });
  });
});
