import type { StateStorage } from "zustand/middleware";
import { mmkv } from "@/libs/mmkv";

// ============================================================================
// MMKV-backed Zustand StateStorage
// Provides persistent storage for Zustand stores via MMKV
// ============================================================================

export const zustandMMKVStorage: StateStorage = {
  getItem: (key: string): string | null => {
    return mmkv.getString(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    mmkv.set(key, value);
  },
  removeItem: (key: string): void => {
    mmkv.delete(key);
  },
};
