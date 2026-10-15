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
    if (next && !(await authenticate(t('user_security.security.lockPrompt')))) return; // cancelled: stay off
    setEnabled(next);
    await Haptics.selectionAsync();
    toast.success(t(next ? 'user_security.security.lockOn' : 'user_security.security.lockOff'));
  }

  return (
    <Card title={t('user_security.security.lockCard')} subtitle={t('user_security.security.lockCardDesc')} loading={available === null}>
      <View className="py-3">
        <Toggle
          checked={enabled}
          onChange={change}
          label={t('user_security.security.lockToggle')}
          ariaLabel={t('user_security.security.lockToggle')}
          disabled={!available && !enabled}
        />
        {available === false && !enabled ? (
          <Text className="mt-2 text-xs text-text-secondary" testID="app-lock-unavailable">
            {t('user_security.security.lockUnavailable')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
