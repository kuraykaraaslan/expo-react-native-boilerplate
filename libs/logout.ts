import { router } from 'expo-router';
import { toast } from 'sonner-native';
import i18n from '@/libs/i18n';
import { useAppLockStore } from '@/libs/appLock';
import { useAuthStore } from '@/stores/authStore';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { clearAllTokens } from '@/libs/secureStorage';
import logger from '@/libs/logger';

/**
 * Signs out of every organization this device holds a session for (one token
 * pair per tenant), then wipes local state. Server revocation is best effort:
 * offline or an already-dead session must never block signing out.
 */
export async function logout(): Promise<void> {
  const tenantIds = [...new Set([getActiveTenantId(), ...useTenantStore.getState().knownTenantIds])];
  const results = await Promise.allSettled(tenantIds.map((id) => AuthClientService.logout(id)));
  if (results.some((r) => r.status === 'rejected')) {
    logger.warn('Server logout failed for some tenants, clearing local state anyway');
  }
  await clearAllTokens();
  useAuthStore.getState().logout();
  useAppLockStore.getState().reset(); // the next account must not inherit this one's lock
  useTenantStore.getState().flush();
  router.replace('/login');
  toast.success(i18n.t('AUTH.LOGOUT_SUCCESS'));
}
