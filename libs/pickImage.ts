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

export type PickImageOptions = {
  /** Let the user crop in the picker. Default true. */
  crop?: boolean;
  /** Crop aspect ratio [width, height]; only used when `crop` is on. Default square. */
  aspect?: [number, number];
  /** Width the photo is scaled to before encoding (height follows). */
  widthPx?: number;
  /** File name prefix: `<prefix>-<timestamp>.jpg`. */
  namePrefix?: string;
};

/** Pick a photo, resize it to `widthPx` and re-encode it as JPEG. */
export async function pickImage(source: ImageSource, opts: PickImageOptions = {}): Promise<PickResult> {
  const { crop = true, aspect = [1, 1], widthPx = AVATAR_EDGE_PX, namePrefix = "photo" } = opts;
  const permission =
    source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: "denied" };

  const options: ImagePicker.ImagePickerOptions = crop
    ? { mediaTypes: ["images"], allowsEditing: true, aspect, quality: 1 }
    : { mediaTypes: ["images"], allowsEditing: false, quality: 1 };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return { status: "cancelled" };

  const out = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: widthPx } }], {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { status: "picked", file: { uri: out.uri, name: `${namePrefix}-${Date.now()}.jpg`, type: "image/jpeg" } };
}

/** Square-cropped 512 px profile photo. */
export function pickAvatarImage(source: ImageSource): Promise<PickResult> {
  return pickImage(source, { crop: true, aspect: [1, 1], widthPx: AVATAR_EDGE_PX, namePrefix: "avatar" });
}
