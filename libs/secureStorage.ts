import * as SecureStore from "expo-secure-store";

// ============================================================================
// Token Key Types
// ============================================================================

type TokenKey = "accessToken" | "refreshToken";

// ============================================================================
// SecureStore Token Helpers
// ============================================================================

export async function getToken(key: TokenKey): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setToken(key: TokenKey, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function clearToken(key: TokenKey): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function clearAllTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync("accessToken"),
    SecureStore.deleteItemAsync("refreshToken"),
  ]);
}
