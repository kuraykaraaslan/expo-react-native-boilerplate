import { router } from 'expo-router';
import { toast } from 'sonner-native';
import i18n from '@/libs/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { clearAllTokens } from '@/libs/secureStorage';
import logger from '@/libs/logger';

export async function logout(): Promise<void> {
  try {
    await AuthClientService.logout();
  } catch {
    logger.warn('Server logout failed, clearing local state anyway');
  }
  await clearAllTokens();
  useAuthStore.getState().logout();
  useTenantStore.getState().flush();
  router.replace('/login');
  toast.success(i18n.t('AUTH.LOGOUT_SUCCESS'));
}
