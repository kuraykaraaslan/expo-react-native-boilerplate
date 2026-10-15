import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  faBuilding,
  faCircleUser,
  faEnvelope,
  faEnvelopeOpenText,
  faLaptop,
  faFileContract,
  faLink,
  faShieldHalved,
  faRightFromBracket,
  faSliders,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { LinkTile } from '@/components/common/LinkTile';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SectionLabel } from '@/components/common/SectionLabel';
import { logout } from '@/libs/logout';

// Settings hub (appshell-compliance "Hub Pattern"): links only, no settings fields.
export default function SettingsHubScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScreenHeader title={t('account.settingsHub.title')} subtitle={t('account.settingsHub.subtitle')} />

      <View className="gap-3">
        <SectionLabel>{t('account.settingsHub.sectionAccount')}</SectionLabel>
        <LinkTile icon={faCircleUser} title={t('account.settingsHub.profile')} description={t('account.settingsHub.profileDesc')} href="/settings/profile" testID="settings-hub-profile" />
        <LinkTile icon={faLaptop} title={t('account.settingsHub.sessions')} description={t('account.settingsHub.sessionsDesc')} href="/settings/sessions" testID="settings-hub-sessions" />

        <LinkTile icon={faShieldHalved} title={t('account.settingsHub.security')} description={t('account.settingsHub.securityDesc')} href="/settings/security" testID="settings-hub-security" />
        <LinkTile icon={faFileContract} title={t('privacy.center.title')} description={t('privacy.center.tileDesc')} href="/settings/legal" testID="settings-hub-legal" />
        <LinkTile icon={faLink} title={t('account.settingsHub.social')} description={t('account.settingsHub.socialDesc')} href="/settings/social-accounts" testID="settings-hub-social" />
        <LinkTile icon={faSliders} title={t('account.settingsHub.preferences')} description={t('account.settingsHub.preferencesDesc')} href="/settings/change-language" testID="settings-hub-preferences" />
      </View>

      <View className="gap-3">
        <SectionLabel>{t('account.settingsHub.sectionOrganization')}</SectionLabel>
        <LinkTile icon={faBuilding} title={t('account.settingsHub.organization')} description={t('account.settingsHub.organizationDesc')} href="/settings/tenant" testID="settings-hub-organization" />
        <LinkTile icon={faUsers} title={t('account.settingsHub.members')} description={t('account.settingsHub.membersDesc')} href="/settings/tenant/members" testID="settings-hub-members" />
        <LinkTile icon={faEnvelopeOpenText} title={t('account.settingsHub.invitations')} description={t('account.settingsHub.invitationsDesc')} href="/settings/tenant/invitations" testID="settings-hub-invitations" />
      </View>

      <LinkTile icon={faRightFromBracket} title={t('app_shell.shell.signOut')} description={t('account.settingsHub.signOutDesc')} onPress={logout} danger testID="settings-hub-sign-out" />
    </Screen>
  );
}
