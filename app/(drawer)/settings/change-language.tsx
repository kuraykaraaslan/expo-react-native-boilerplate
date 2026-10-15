import { useTranslation } from 'react-i18next';
import { PreferencesCard } from '@/components/account/PreferencesCard';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';

export default function PreferencesScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScreenHeader back={{ label: t('account.settingsHub.title'), href: '/settings' }} title={t('user.preferences.title')} subtitle={t('user.preferences.subtitle')} />
      <PreferencesCard />
    </Screen>
  );
}
