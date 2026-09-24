import { useTranslation } from 'react-i18next';
import { PreferencesCard } from '@/components/account/PreferencesCard';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';

export default function PreferencesScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScreenHeader back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }} title={t('PREFERENCES.TITLE')} subtitle={t('PREFERENCES.SUBTITLE')} />
      <PreferencesCard />
    </Screen>
  );
}
