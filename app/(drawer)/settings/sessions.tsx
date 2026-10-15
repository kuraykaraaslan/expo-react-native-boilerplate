import { useTranslation } from 'react-i18next';
import { SessionsCard } from '@/components/account/SessionsCard';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';

export default function SessionsScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScreenHeader back={{ label: t('account.settingsHub.title'), href: '/settings' }} title={t('user_session.active.titlePage')} subtitle={t('user_session.active.subtitleMobile')} />
      <SessionsCard />
    </Screen>
  );
}
