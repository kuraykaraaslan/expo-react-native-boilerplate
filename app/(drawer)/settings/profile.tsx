import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PreferencesCard } from '@/components/account/PreferencesCard';
import { ProfileCard } from '@/components/account/ProfileCard';
import { SecurityCard } from '@/components/account/SecurityCard';
import { SessionsCard } from '@/components/account/SessionsCard';
import { RoleBadge } from '@/components/common/Badges';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TabGroup } from '@/components/ui';
import { useTenantStore } from '@/stores/tenantStore';

// next-boilerplate "Profilim": role badge beside the title, Profil / Güvenlik / Tercihler tabs.
export default function ProfileScreen() {
  const { t } = useTranslation();
  const role = useTenantStore((s) => s.selectedTenantMembership?.memberRole);

  return (
    <Screen keyboard>
      <ScreenHeader
        back={{ label: t('account.settingsHub.title'), href: '/settings' }}
        title={t('account.me.title')}
        subtitle={t('account.me.subtitle')}
        badge={role ? <RoleBadge role={role} /> : undefined}
      />
      <TabGroup
        label={t('account.me.title')}
        lazy
        tabs={[
          { id: 'profile', label: t('account.me.tabProfile'), content: <ProfileCard /> },
          {
            id: 'security',
            label: t('account.me.tabSecurity'),
            content: (
              <View className="gap-6">
                <SecurityCard />
                <SessionsCard />
              </View>
            ),
          },
          { id: 'preferences', label: t('account.me.tabPreferences'), content: <PreferencesCard /> },
        ]}
      />
    </Screen>
  );
}
