import { router } from 'expo-router';
import { toast } from 'sonner-native';
import i18n from '@/libs/i18n';
import { clearLocalSession } from '@/libs/logout';
import { resetRealtime } from '@/libs/realtime';
import { useBrandingStore } from '@/stores/brandingStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSSOStore } from '@/stores/ssoStore';
import type { AccountDeletionResponse } from '@/services/compliance/compliance.dto';

/**
 * The server deleted the account and revoked every session, so there is nothing to sign out of:
 * NO server logout is attempted (every call would 401). Everything the device holds for the account is
 * wiped (the same wipe as logout, plus the socket, message cache, bell count, SSO state and cached brand colors),
 * then the user lands on login with a notice. The device language and theme are not account data and stay.
 *
 * Applied unconditionally: the account no longer exists, whatever organization is active now.
 */
export async function finishAccountDeletion(result: Pick<AccountDeletionResponse, 'status'>): Promise<void> {
  resetRealtime(); // close the socket first: it would otherwise reconnect with a dead token
  await clearLocalSession();
  useNotificationStore.getState().setUnreadCount(0);
  useSSOStore.getState().setPendingState(null);
  useBrandingStore.setState({ byTenant: {} });
  router.replace('/login');
  if (result.status === 'PARTIAL') {
    toast.success(i18n.t('ACCOUNT_DATA.DELETED_PARTIAL'), { duration: 10000 });
  } else {
    toast.success(i18n.t('ACCOUNT_DATA.DELETED'), { duration: 8000 });
  }
}
