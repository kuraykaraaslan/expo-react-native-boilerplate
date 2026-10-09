import axiosInstance from "@/libs/axios";
import { buildUploadForm, type UploadFile } from "@/libs/upload";
import { StorageUsageSchema, UploadResponseSchema, type StorageUsage, type UploadResponse } from "@/services/platform/storage.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export type UploadOptions = {
  folder?: string;
  /** 0–1, from the request body being sent. */
  onProgress?: (fraction: number) => void;
  /** Aborting rejects with a CanceledError; nothing is stored client-side. */
  signal?: AbortSignal;
};

export class StorageClientService {
  static async upload(file: UploadFile, opts: UploadOptions = {}): Promise<UploadResponse> {
    const res = await axiosInstance.post("/storage", buildUploadForm(file, opts.folder), {
      // React Native fills in the multipart boundary itself; axios would otherwise keep
      // the instance default (application/json) and the server would see no form data.
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000, // the instance's 10 s is for JSON calls, not photo uploads
      signal: opts.signal,
      onUploadProgress: (e) => {
        if (opts.onProgress && e.total) opts.onProgress(Math.min(1, e.loaded / e.total));
      },
    });
    return UploadResponseSchema.parse(res.data);
  }

  static async getUsage(): Promise<StorageUsage> {
    const res = await axiosInstance.get("/storage/usage");
    return StorageUsageSchema.parse(res.data);
  }
}
