import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { AlertBanner, Card, Toggle } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { registerPushForAllTenants, requestPushPermission, unregisterAllPush } from '@/libs/push';
import { safeHaptic } from '@/libs/safeHaptics';
import { usePushPermission } from '@/libs/usePushPermission';
import { ProfileClientService } from '@/services/user/profile.service.client';
import { usePushStore } from '@/stores/pushStore';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';

/**
 * Notification settings: the switch for THIS device (registers / removes its push tokens) and the account-wide
 * `pushNotifications` preference the server's dispatcher honours for every device.
 */
export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const { permission, refresh } = usePushPermission();
  const deviceEnabled = usePushStore((s) => s.enabled);
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const [accountPush, setAccountPush] = useState<boolean | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  // The preference is read through the active organization: after a switch, read it again.
  useEffect(() => {
    let cancelled = false;
    setAccountPush(null);
    ProfileClientService.getPreferences()
      .then((prefs) => !cancelled && setAccountPush(prefs.pushNotifications))
      .catch((err: unknown) => {
        if (!cancelled) handleApiError(err, 'NotificationSettingsScreen.load');
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function toggleDevice(on: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (!on) {
        usePushStore.getState().setEnabled(false);
        await unregisterAllPush();
        return;
      }
      usePushStore.getState().setEnabled(true);
      let current = await refresh();
      if (current === 'undetermined') current = await requestPushPermission();
      if (current !== 'granted') {
        if (current === 'denied') toast.info(t('PUSH.DENIED_TOAST'));
        return;
      }
      const result = await registerPushForAllTenants();
      if (result === 'registered') {
        void safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        toast.success(t('PUSH.ENABLED_TOAST'));
      } else if (result === 'failed' || result === 'no-project-id') {
        void safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
        toast.error(result === 'no-project-id' ? t('PUSH.NO_PROJECT') : t('PUSH.FAILED_TOAST'));
      }
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  async function toggleAccount(on: boolean) {
    const tenant = getActiveTenantId();
    const previous = accountPush;
    setAccountPush(on);
    setSavingAccount(true);
    try {
      const saved = await ProfileClientService.updatePreferences({ pushNotifications: on });
      if (getActiveTenantId() === tenant) setAccountPush(saved.pushNotifications);
    } catch (err: unknown) {
      if (getActiveTenantId() === tenant) setAccountPush(previous);
      void safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      handleApiError(err, 'NotificationSettingsScreen.saveAccount');
    } finally {
      setSavingAccount(false);
    }
  }

  const unsupported = permission === 'unsupported';

  return (
    <Screen>
      <ScreenHeader back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }} title={t('PUSH.TITLE')} subtitle={t('PUSH.SUBTITLE')} />

      {unsupported ? <AlertBanner variant="info" message={t('PUSH.UNSUPPORTED')} /> : null}
      {permission === 'denied' ? (
        <AlertBanner
          variant="warning"
          title={t('PUSH.DENIED_TITLE')}
          message={t('PUSH.DENIED_DESC')}
          action={{ label: t('PUSH.OPEN_SETTINGS'), onPress: () => void Linking.openSettings() }}
        />
      ) : null}

      <Card title={t('PUSH.DEVICE_CARD')} subtitle={t('PUSH.DEVICE_CARD_DESC')}>
        <View className="py-2">
          <Toggle
            checked={deviceEnabled && permission === 'granted'}
            onChange={toggleDevice}
            label={t('PUSH.DEVICE_TOGGLE')}
            description={t('PUSH.DEVICE_TOGGLE_DESC')}
            disabled={unsupported || permission === null || busy}
          />
        </View>
      </Card>

      <Card title={t('PUSH.ACCOUNT_CARD')} subtitle={t('PUSH.ACCOUNT_CARD_DESC')}>
        <View className="py-2">
          <Toggle
            checked={accountPush ?? false}
            onChange={toggleAccount}
            label={t('PUSH.ACCOUNT_TOGGLE')}
            description={t('PUSH.ACCOUNT_TOGGLE_DESC')}
            disabled={accountPush === null || savingAccount}
          />
        </View>
      </Card>
    </Screen>
  );
}
