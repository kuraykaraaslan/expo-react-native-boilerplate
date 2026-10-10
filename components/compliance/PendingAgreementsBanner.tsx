import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AlertBanner } from '@/components/ui';
import { usePendingAgreements } from '@/libs/pendingAgreements';

/**
 * Non-blocking notice that agreements are waiting for acceptance (the `compliance`
 * section of the session). One pending document opens its reader; several open
 * the legal screen, which lists them. Renders nothing when nothing is pending.
 */
export function PendingAgreementsBanner({ testID = 'pending-agreements-banner' }: Readonly<{ testID?: string }>) {
  const { t } = useTranslation();
  const pending = usePendingAgreements();
  if (pending.length === 0) return null;

  const first = pending[0];
  const open = () =>
    pending.length === 1
      ? router.push({ pathname: '/settings/agreement', params: { type: first.type } })
      : router.push('/settings/legal');

  return (
    <View testID={testID}>
      <AlertBanner
        variant="warning"
        title={t('AGREEMENTS.BANNER_TITLE')}
        message={pending.length === 1 ? t('AGREEMENTS.BANNER_ONE', { title: first.title || first.key }) : t('AGREEMENTS.BANNER_MANY', { count: pending.length })}
        action={{ label: t('AGREEMENTS.REVIEW'), onPress: open }}
      />
    </View>
  );
}
