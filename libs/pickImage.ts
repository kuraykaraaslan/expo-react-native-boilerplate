import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { UploadFile } from "@/libs/upload";

// ============================================================================
// Photo picking for uploads: camera or library, square crop, then resized and
// re-encoded as JPEG so a 12 MP photo does not travel over mobile data (and
// the EXIF/GPS block is dropped). Picker URIs can be cache paths that vanish,
// so the result is the manipulated copy, not the original.
// ============================================================================

export type ImageSource = "camera" | "library";
/** `denied`: the OS permission was refused. `cancelled`: the user backed out. */
export type PickResult = { status: "picked"; file: UploadFile } | { status: "denied" } | { status: "cancelled" };

const AVATAR_EDGE_PX = 512;
const JPEG_QUALITY = 0.8;

export async function pickAvatarImage(source: ImageSource): Promise<PickResult> {
  const permission =
    source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: "denied" };

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return { status: "cancelled" };

  const out = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: AVATAR_EDGE_PX } }], {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { status: "picked", file: { uri: out.uri, name: `avatar-${Date.now()}.jpg`, type: "image/jpeg" } };
}
