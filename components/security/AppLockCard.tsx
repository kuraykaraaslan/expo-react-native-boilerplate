import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Card, Text, Toggle } from '@/components/ui';
import { authenticate, deviceAuthAvailable } from '@/libs/biometrics';
import { useAppLockStore } from '@/libs/appLock';

/** "Require biometrics" — turning it on needs a successful prompt first, so a user cannot lock themselves out by accident. */
export function AppLockCard() {
  const { t } = useTranslation();
  const enabled = useAppLockStore((s) => s.enabled);
  const setEnabled = useAppLockStore((s) => s.setEnabled);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    void deviceAuthAvailable().then(setAvailable);
  }, []);

  async function change(next: boolean) {
    if (next && !(await authenticate(t('SECURITY.LOCK_PROMPT')))) return; // cancelled: stay off
    setEnabled(next);
    await Haptics.selectionAsync();
    toast.success(t(next ? 'SECURITY.LOCK_ON' : 'SECURITY.LOCK_OFF'));
  }

  return (
    <Card title={t('SECURITY.LOCK_CARD')} subtitle={t('SECURITY.LOCK_CARD_DESC')} loading={available === null}>
      <View className="py-3">
        <Toggle
          checked={enabled}
          onChange={change}
          label={t('SECURITY.LOCK_TOGGLE')}
          ariaLabel={t('SECURITY.LOCK_TOGGLE')}
          disabled={!available && !enabled}
        />
        {available === false && !enabled ? (
          <Text className="mt-2 text-xs text-text-secondary" testID="app-lock-unavailable">
            {t('SECURITY.LOCK_UNAVAILABLE')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
