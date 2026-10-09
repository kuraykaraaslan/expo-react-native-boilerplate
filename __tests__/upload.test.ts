import { IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES, buildUploadForm, checkUpload } from "@/libs/upload";
import { StorageClientService } from "@/services/platform/storage.service.client";
import axiosInstance from "@/libs/axios";
import { http, HttpResponse } from "msw";
import { API_ORIGIN, mockRoute, signIn } from "./_helpers";
import { server } from "./_server";
import { TENANT_ID } from "./fixtures";

jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

const photo = { uri: "file:///cache/avatar.jpg", name: "avatar.jpg", type: "image/jpeg" };

describe("checkUpload", () => {
  it("accepts a normal image", () => {
    expect(checkUpload({ type: "image/jpeg", size: 200_000 }, { mimeTypes: IMAGE_MIME_TYPES })).toBeNull();
  });
  it("rejects empty, oversize and disallowed types before any request", () => {
    expect(checkUpload({ type: "image/png", size: 0 })).toBe("EMPTY");
    expect(checkUpload({ type: "image/png", size: MAX_UPLOAD_BYTES + 1 })).toBe("TOO_LARGE");
    expect(checkUpload({ type: "application/x-msdownload", size: 10 }, { mimeTypes: IMAGE_MIME_TYPES })).toBe("TYPE_NOT_ALLOWED");
  });
  it("does not reject on an unknown size (the picker may not report one)", () => {
    expect(checkUpload({ type: "image/png" })).toBeNull();
  });
});

describe("buildUploadForm", () => {
  it("sends the file as a { uri, name, type } part plus the folder", () => {
    // Jest runs on Node's FormData; React Native's accepts the {uri,name,type} object as-is.
    const append = jest.spyOn(FormData.prototype, "append").mockImplementation(() => undefined);
    buildUploadForm(photo, "avatars");
    expect(append.mock.calls).toEqual([
      ["file", { uri: photo.uri, name: "avatar.jpg", type: "image/jpeg" }],
      ["folder", "avatars"],
    ]);
    append.mockRestore();
  });
});

describe("StorageClientService.upload", () => {
  beforeEach(() => signIn(TENANT_ID));

  it("posts multipart to /storage and parses the stored file", async () => {
    const post = jest.spyOn(axiosInstance, "post").mockResolvedValueOnce({ data: { message: "File uploaded successfully", uploadedFileId: "f1", url: "https://cdn.test/a.jpg", key: "k", size: 10 } });
    const stored = await StorageClientService.upload(photo, { folder: "avatars" });
    expect(stored.url).toBe("https://cdn.test/a.jpg");
    const [path, body, config] = post.mock.calls[0];
    expect(path).toBe("/storage");
    expect(body).toBeInstanceOf(FormData);
    expect(config?.headers).toEqual({ "Content-Type": "multipart/form-data" });
    post.mockRestore();
  });

  it("reads quota usage", async () => {
    mockRoute("get", "/storage/usage", { usedBytes: 5, quotaBytes: -1, remainingBytes: -1 });
    await expect(StorageClientService.getUsage()).resolves.toEqual({ usedBytes: 5, quotaBytes: -1, remainingBytes: -1 });
  });

  it("surfaces a server rejection as the server's own error", async () => {
    server.use(http.post(`${API_ORIGIN}/api/tenant/:tenantId/storage`, () => HttpResponse.json({ message: "File exceeds the maximum allowed size" }, { status: 400 })));
    await expect(StorageClientService.upload(photo)).rejects.toMatchObject({ response: { status: 400 } });
  });
});
