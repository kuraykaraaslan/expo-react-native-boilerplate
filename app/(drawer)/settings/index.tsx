import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  faBuilding,
  faCircleUser,
  faEnvelope,
  faEnvelopeOpenText,
  faLaptop,
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
      <ScreenHeader title={t('SETTINGS_HUB.TITLE')} subtitle={t('SETTINGS_HUB.SUBTITLE')} />

      <View className="gap-3">
        <SectionLabel>{t('SETTINGS_HUB.SECTION_ACCOUNT')}</SectionLabel>
        <LinkTile icon={faCircleUser} title={t('SETTINGS_HUB.PROFILE')} description={t('SETTINGS_HUB.PROFILE_DESC')} href="/settings/profile" testID="settings-hub-profile" />
        <LinkTile icon={faLaptop} title={t('SETTINGS_HUB.SESSIONS')} description={t('SETTINGS_HUB.SESSIONS_DESC')} href="/settings/sessions" testID="settings-hub-sessions" />

        <LinkTile icon={faShieldHalved} title={t('SETTINGS_HUB.SECURITY')} description={t('SETTINGS_HUB.SECURITY_DESC')} href="/settings/security" testID="settings-hub-security" />
        <LinkTile icon={faLink} title={t('SETTINGS_HUB.SOCIAL')} description={t('SETTINGS_HUB.SOCIAL_DESC')} href="/settings/social-accounts" testID="settings-hub-social" />
        <LinkTile icon={faSliders} title={t('SETTINGS_HUB.PREFERENCES')} description={t('SETTINGS_HUB.PREFERENCES_DESC')} href="/settings/change-language" testID="settings-hub-preferences" />
      </View>

      <View className="gap-3">
        <SectionLabel>{t('SETTINGS_HUB.SECTION_ORGANIZATION')}</SectionLabel>
        <LinkTile icon={faBuilding} title={t('SETTINGS_HUB.ORGANIZATION')} description={t('SETTINGS_HUB.ORGANIZATION_DESC')} href="/settings/tenant" testID="settings-hub-organization" />
        <LinkTile icon={faUsers} title={t('SETTINGS_HUB.MEMBERS')} description={t('SETTINGS_HUB.MEMBERS_DESC')} href="/settings/tenant/members" testID="settings-hub-members" />
        <LinkTile icon={faEnvelopeOpenText} title={t('SETTINGS_HUB.INVITATIONS')} description={t('SETTINGS_HUB.INVITATIONS_DESC')} href="/settings/tenant/invitations" testID="settings-hub-invitations" />
      </View>

      <LinkTile icon={faRightFromBracket} title={t('SHELL.SIGN_OUT')} description={t('SETTINGS_HUB.SIGN_OUT_DESC')} onPress={logout} danger testID="settings-hub-sign-out" />
    </Screen>
  );
}
