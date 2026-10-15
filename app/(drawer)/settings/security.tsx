import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClockRotateLeft, faMobileScreen } from '@fortawesome/free-solid-svg-icons';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { AppLockCard } from '@/components/security/AppLockCard';
import { TotpDisableModal } from '@/components/security/TotpDisableModal';
import { TotpSetupModal } from '@/components/security/TotpSetupModal';
import { Badge, Button, Card, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import type { UserSecurity } from '@/modules/auth/auth.dto';
import { AuthClientService } from '@/modules/auth/auth.service.client';
import { formatDate } from '@/utils/format';

export default function SecurityScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [security, setSecurity] = useState<UserSecurity | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setSecurity(await AuthClientService.getSecurity());
    } catch (err: unknown) {
      handleApiError(err, 'SecurityScreen.load');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const totpOn = security?.otpMethods.includes('TOTP_APP') ?? false;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader
        back={{ label: t('account.settingsHub.title'), href: '/settings' }}
        title={t('user_security.security.title')}
        subtitle={t('user_security.security.subtitle')}
      />

      <Card title={t('user_security.security.totpCard')} subtitle={t('user_security.security.totpCardDesc')} loading={loading}>
        <View className="flex-row items-center gap-3 py-3">
          <FontAwesomeIcon icon={faMobileScreen} size={16} color={tokens['text-disabled']} />
          <Text className="flex-1 text-sm text-text-primary">{t('user_security.security.totpStatus')}</Text>
          <Badge variant={totpOn ? 'success' : 'neutral'} size="sm" testID="security-totp-status">
            {totpOn ? t('user_security.security.on') : t('user_security.security.off')}
          </Badge>
        </View>
        {totpOn ? (
          <Button variant="outline" onPress={() => setDisableOpen(true)} testID="security-totp-disable">
            {t('user_security.security.disable')}
          </Button>
        ) : (
          <Button onPress={() => setSetupOpen(true)} disabled={!security} testID="security-totp-enable">
            {t('user_security.security.enable')}
          </Button>
        )}
      </Card>

      <Card title={t('user_security.security.activityCard')} loading={loading}>
        <View className="flex-row items-center gap-3 py-3">
          <FontAwesomeIcon icon={faClockRotateLeft} size={16} color={tokens['text-disabled']} />
          <View className="min-w-0 flex-1">
            <Text className="text-sm text-text-primary">{t('user_security.security.lastSignIn')}</Text>
            <Text className="text-xs text-text-secondary" numberOfLines={1}>
              {[security?.lastLoginAt ? formatDate(security.lastLoginAt) : null, security?.lastLoginDevice].filter(Boolean).join('  ·  ') || '—'}
            </Text>
          </View>
        </View>
      </Card>

      <AppLockCard />

      <TotpSetupModal open={setupOpen} onClose={() => setSetupOpen(false)} onEnabled={load} />
      <TotpDisableModal open={disableOpen} onClose={() => setDisableOpen(false)} onDisabled={load} />
    </Screen>
  );
}
