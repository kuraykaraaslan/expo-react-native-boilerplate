import { router } from 'expo-router';
import { toast } from 'sonner-native';
import i18n from '@/libs/i18n';
import { useAppLockStore } from '@/libs/appLock';
import { useAuthStore } from '@/stores/authStore';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { clearAllTokens } from '@/libs/secureStorage';
import { useFlagStore } from '@/stores/flagStore';
import logger from '@/libs/logger';
import { clearPendingAgreements } from '@/libs/pendingAgreements';
import { clearOutbox } from '@/libs/outbox';
import { unregisterAllPush } from '@/libs/push';
import { usePushStore } from '@/stores/pushStore';

/**
 * Wipes everything this device holds for the signed-in account: every organization's tokens,
 * unsent messages, the signed-in user, flags, the app lock and the tenant list. Server calls are
 * the caller's business (logout revokes sessions; an account deletion has none left to revoke).
 */
export async function clearLocalSession(): Promise<void> {
  await clearAllTokens();
  clearOutbox(); // unsent messages belong to this account: never carry them to the next one
  useAuthStore.getState().logout();
  clearPendingAgreements(); // the flag is per account
  useFlagStore.getState().clear(); // flags are evaluated per user
  useAppLockStore.getState().reset(); // the next account must not inherit this one's lock
  useTenantStore.getState().flush();
  usePushStore.getState().clearRegistrations(); // per-account bookkeeping; the install id and the device switch stay
}

/**
 * Signs out of every organization this device holds a session for (one token
 * pair per tenant), then wipes local state. Server revocation is best effort:
 * offline or an already-dead session must never block signing out.
 *
 * The push tokens come off the server FIRST: the server's logout revokes the session but not the token, and the
 * request needs the bearer token that is cleared below. `unregisterAllPush` never throws and is time-capped.
 */
export async function logout(): Promise<void> {
  await unregisterAllPush();
  const tenantIds = [...new Set([getActiveTenantId(), ...useTenantStore.getState().knownTenantIds])];
  const results = await Promise.allSettled(tenantIds.map((id) => AuthClientService.logout(id)));
  if (results.some((r) => r.status === 'rejected')) {
    logger.warn('Server logout failed for some tenants, clearing local state anyway');
  }
  await clearLocalSession();
  router.replace('/login');
  toast.success(i18n.t('AUTH.LOGOUT_SUCCESS'));
}
