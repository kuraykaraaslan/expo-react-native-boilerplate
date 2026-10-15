import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import logger from "@/libs/logger";
import { avatarFileName, checkImage } from "@/libs/upload";
import { StorageClientService } from "@/modules/storage/storage.service.client";

// ============================================================================
// Pick (camera or library) → square-crop → resize → upload → URL.
// Resizing before the upload keeps a phone photo (often 3–8 MB) down to a few
// hundred KB, which is what matters on mobile data and the server's size limit.
// The returned URL goes into the profile's `profilePicture`.
// ============================================================================

export type AvatarSource = "camera" | "library";

export type AvatarResult =
  | { status: "ok"; url: string }
  | { status: "cancelled" }
  | { status: "denied" } // camera permission refused
  | { status: "invalid"; reason: "NOT_IMAGE" | "TOO_LARGE" };

/** Edge length of the stored avatar; the profile only ever shows it small. */
export const AVATAR_SIZE_PX = 512;

export async function pickAndUploadAvatar(source: AvatarSource): Promise<AvatarResult> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { status: "denied" };
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9 };
  const picked = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (picked.canceled || !picked.assets?.[0]) return { status: "cancelled" };

  const asset = picked.assets[0];
  const invalid = checkImage(asset);
  if (invalid) return { status: "invalid", reason: invalid };

  const resized = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: AVATAR_SIZE_PX } }], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  logger.debug("[avatar] resized", resized.width, resized.height);

  const uploaded = await StorageClientService.upload({ uri: resized.uri, name: avatarFileName(), type: "image/jpeg" }, "avatars");
  return { status: "ok", url: uploaded.url };
}
