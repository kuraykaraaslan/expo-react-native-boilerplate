import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { Button, Text } from '@/components/ui';
import { authenticate } from '@/libs/biometrics';
import { useAppLockStore } from '@/libs/appLock';
import { logout } from '@/libs/logout';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

/**
 * Full-screen cover shown while the app lock is engaged. It prompts on appear and
 * on demand; cancelling keeps it locked. "Sign out" is the only other way out.
 */
export function AppLockScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const unlock = useAppLockStore((s) => s.unlock);
  const [busy, setBusy] = useState(false);
  const prompting = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (prompting.current) return; // one system prompt at a time
    prompting.current = true;
    setBusy(true);
    try {
      if (await authenticate(t('SECURITY.LOCK_PROMPT'))) unlock();
    } finally {
      prompting.current = false;
      setBusy(false);
    }
  }, [t, unlock]);

  useEffect(() => {
    void tryUnlock();
  }, [tryUnlock]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: tokens['surface-base'] }]}
      className="items-center justify-center gap-6 px-8"
      accessibilityViewIsModal
      testID="app-lock-screen"
    >
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-subtle">
        <FontAwesomeIcon icon={faLock} size={24} color={tokens.primary} />
      </View>
      <View className="items-center gap-1">
        <Text className="text-xl font-semibold text-text-primary">{t('SECURITY.LOCKED_TITLE')}</Text>
        <Text className="text-center text-sm text-text-secondary">{t('SECURITY.LOCKED_DESC')}</Text>
      </View>
      <View className="w-full max-w-xs gap-2">
        <Button fullWidth loading={busy} onPress={tryUnlock} testID="app-lock-unlock">
          {t('SECURITY.UNLOCK')}
        </Button>
        <Button fullWidth variant="ghost" onPress={() => void logout()} testID="app-lock-sign-out">
          {t('SHELL.SIGN_OUT')}
        </Button>
      </View>
    </View>
  );
}
