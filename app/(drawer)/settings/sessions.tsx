import { useTranslation } from 'react-i18next';
import { SessionsCard } from '@/components/account/SessionsCard';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';

export default function SessionsScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScreenHeader back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }} title={t('SESSIONS.TITLE')} subtitle={t('SESSIONS.SUBTITLE')} />
      <SessionsCard />
    </Screen>
  );
}
