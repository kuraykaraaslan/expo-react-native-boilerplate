import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Button, Modal, Text } from '@/components/ui';
import { registerPushForActiveTenant, requestPushPermission } from '@/libs/push';
import { safeHaptic } from '@/libs/safeHaptics';
import { usePushPermission } from '@/libs/usePushPermission';
import { usePushStore } from '@/stores/pushStore';

/** The pre-prompt waits this long after the signed-in shell opens, so it never greets the person at launch. */
export const PREPROMPT_DELAY_MS = 2_500;

/**
 * Explains why notifications are useful BEFORE the one-shot OS prompt (a refused OS prompt cannot be repeated).
 * Mounted under the signed-in shell; shown once while the permission is undetermined and the person has not said
 * "not now". "Turn on" shows the OS prompt and registers this device for the active organization.
 */
export function PushPrePrompt() {
  const { t } = useTranslation();
  const { permission, refresh } = usePushPermission();
  const deviceEnabled = usePushStore((s) => s.enabled);
  const dismissed = usePushStore((s) => s.promptDismissed);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), PREPROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const visible = ready && permission === 'undetermined' && deviceEnabled && !dismissed;
  if (!visible) return null;

  function later() {
    usePushStore.getState().dismissPrompt();
  }

  async function enable() {
    setBusy(true);
    try {
      usePushStore.getState().dismissPrompt(); // answered either way: never ask again unprompted
      const answer = await requestPushPermission();
      if (answer !== 'granted') {
        toast.info(t('PUSH.DENIED_TOAST'));
        return;
      }
      const result = await registerPushForActiveTenant();
      if (result === 'registered') {
        void safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        toast.success(t('PUSH.ENABLED_TOAST'));
      } else if (result === 'failed' || result === 'no-project-id') {
        toast.error(t('PUSH.FAILED_TOAST'));
      }
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : later}
      title={t('PUSH.PREPROMPT_TITLE')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onPress={later} disabled={busy} testID="push-preprompt-later">
            {t('PUSH.PREPROMPT_LATER')}
          </Button>
          <Button onPress={enable} loading={busy} testID="push-preprompt-enable">
            {t('PUSH.PREPROMPT_ENABLE')}
          </Button>
        </>
      }
    >
      <Text className="text-sm text-text-secondary">{t('PUSH.PREPROMPT_BODY')}</Text>
    </Modal>
  );
}
