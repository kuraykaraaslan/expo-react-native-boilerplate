import * as SecureStore from "expo-secure-store";
import { useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Token Storage — one token pair per tenant (K2)
// A device token is bound to a single tenant, so each tenant the user signs in
// to keeps its own pair; switching back to a tenant needs no password.
// Keys are `${kind}.${tenantId}` (SecureStore allows only [A-Za-z0-9._-]).
// ============================================================================

export type TokenKind = "accessToken" | "refreshToken";
export type TokenPair = { accessToken: string; refreshToken: string };

const KINDS: TokenKind[] = ["accessToken", "refreshToken"];

function keyFor(kind: TokenKind, tenantId: string): string {
  return `${kind}.${tenantId}`;
}

export async function getToken(kind: TokenKind, tenantId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(keyFor(kind, tenantId));
  } catch {
    return null;
  }
}

export async function setToken(kind: TokenKind, tenantId: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(keyFor(kind, tenantId), value);
  useTenantStore.getState().rememberTenant(tenantId);
}

/**
 * Store both tokens of a (rotated) pair. The refresh token rotates on every
 * refresh — keeping the old one would trip the server's reuse detection,
 * which revokes every session of the user.
 */
export async function setTokens(tenantId: string, pair: TokenPair): Promise<void> {
  await Promise.all([setToken("accessToken", tenantId, pair.accessToken), setToken("refreshToken", tenantId, pair.refreshToken)]);
}

export async function clearTenantTokens(tenantId: string): Promise<void> {
  await Promise.all(KINDS.map((kind) => SecureStore.deleteItemAsync(keyFor(kind, tenantId)).catch(() => undefined)));
  useTenantStore.getState().forgetTenant(tenantId);
}

/** Every tenant's pair, plus the pre-K2 unscoped keys. */
export async function clearAllTokens(): Promise<void> {
  const tenantIds = [...useTenantStore.getState().knownTenantIds];
  await Promise.all([
    ...tenantIds.map((id) => clearTenantTokens(id)),
    ...KINDS.map((kind) => SecureStore.deleteItemAsync(kind).catch(() => undefined)),
  ]);
}
