import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { SSO_PROVIDER_META } from '@/components/auth/ssoProviders';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { AlertBanner, Badge, Card, EmptyState, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { SSOProviderEnum, type ConnectedAccount } from '@/services/auth/sso.dto';
import { SSOClientService } from '@/services/auth/sso.service.client';

function AccountRow({ item, last }: Readonly<{ item: ConnectedAccount; last: boolean }>) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const known = SSOProviderEnum.safeParse(item.provider);
  const meta = known.success ? SSO_PROVIDER_META[known.data] : null;
  return (
    <View className={`flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-border'}`}>
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-surface-overlay" accessible={false}>
        <FontAwesomeIcon icon={meta?.icon ?? faLink} size={15} color={meta?.brandColor ?? tokens['text-secondary']} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
          {item.displayName}
        </Text>
        {item.group ? <Text className="text-xs text-text-secondary">{t(`SOCIAL.GROUP_${item.group.toUpperCase()}`, { defaultValue: item.group })}</Text> : null}
      </View>
      {item.tokenExpired ? (
        <Badge variant="warning" size="sm">
          {t('SOCIAL.TOKEN_EXPIRED')}
        </Badge>
      ) : null}
    </View>
  );
}

/** Linked sign-in identities, read-only: linking and unlinking wait for the server change (K4). */
export default function SocialAccountsScreen() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    SSOClientService.getSocialAccounts()
      .then((list) => !cancelled && setAccounts(list))
      .catch((err: unknown) => handleApiError(err, 'SocialAccountsScreen.load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Screen>
      <ScreenHeader back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }} title={t('SOCIAL.TITLE')} subtitle={t('SOCIAL.SUBTITLE')} />
      <Card title={t('SOCIAL.CARD')} subtitle={t('SOCIAL.CARD_DESC', { count: accounts.length })} loading={loading}>
        {accounts.length === 0 ? (
          <EmptyState icon={faLink} title={t('SOCIAL.EMPTY')} className="py-8" />
        ) : (
          accounts.map((a, i) => <AccountRow key={a.userSocialAccountId} item={a} last={i === accounts.length - 1} />)
        )}
      </Card>
      <AlertBanner variant="info" message={t('SOCIAL.LINKING_SOON')} />
    </Screen>
  );
}
