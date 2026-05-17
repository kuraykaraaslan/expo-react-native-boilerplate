import { MMKV } from "react-native-mmkv";

// ============================================================================
// MMKV Instance (app-wide persistent storage)
// ============================================================================

export const mmkv = new MMKV({ id: "app-storage" });
