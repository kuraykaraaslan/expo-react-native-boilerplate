import { Platform } from "react-native";
import axiosInstance from "@/libs/axios";
import { UploadResponseSchema, type LocalFile, type UploadResponse } from "@/modules/storage/storage.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

/** Uploads can be slow on mobile data; the instance default (10 s) is for JSON calls. */
const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * React Native's FormData takes a `{ uri, name, type }` part; the web build needs a real Blob.
 * Exported so the shape is testable without a network.
 */
export async function buildUploadForm(file: LocalFile, folder: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    form.append("file", blob, file.name);
  } else {
    form.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  form.append("folder", folder);
  return form;
}

export class StorageClientService {
  /**
   * The shared axios instance defaults to `Content-Type: application/json`, and axios turns a
   * FormData body into JSON when it sees that header — so the multipart type must be set
   * explicitly here (the boundary is added by the platform's networking layer).
   */
  static async upload(file: LocalFile, folder = "general"): Promise<UploadResponse> {
    const form = await buildUploadForm(file, folder);
    const res = await axiosInstance.post("/storage", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: UPLOAD_TIMEOUT_MS,
    });
    return UploadResponseSchema.parse(res.data);
  }
}
