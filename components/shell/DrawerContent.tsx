import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { DrawerContentScrollView } from 'expo-router/drawer';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faBell,
  faCircleUser,
  faEnvelopeOpenText,
  faGear,
  faChevronDown,
  faHouse,
  faLaptop,
  faShieldHalved,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { useTenantStore } from '@/stores/tenantStore';
import { Text } from '@/components/ui';
import { DrawerNavLink } from './DrawerNavLink';
import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';

function GroupLabel({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-disabled">
      {children}
    </Text>
  );
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const tenantName = useTenantStore((s) => s.selectedTenantMembership?.tenant?.name);

  return (
    <View className="flex-1 bg-surface-raised">
      {/* Brand row — 56pt + status bar, as next-boilerplate's sidebar header */}
      <View
        className="flex-row items-center gap-2.5 border-b border-border px-4"
        style={{ height: 56 + insets.top, paddingTop: insets.top }}
      >
        <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary" accessible={false}>
          <FontAwesomeIcon icon={faShieldHalved} size={14} color={tokens['primary-fg']} />
        </View>
        {/* Tapping the organization name opens the switcher. */}
        <Pressable
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/select-tenant');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('SHELL.SWITCH_ORG_A11Y', { name: tenantName ?? t('SHELL.PLATFORM') })}
          hitSlop={8}
          className="min-w-0 flex-1 flex-row items-center gap-2"
          testID="shell-switch-org"
        >
          <Text className="shrink text-sm font-semibold text-text-primary" numberOfLines={1}>
            {tenantName ?? t('SHELL.PLATFORM')}
          </Text>
          <FontAwesomeIcon icon={faChevronDown} size={10} color={tokens['text-disabled']} />
        </Pressable>
      </View>

      <DrawerContentScrollView {...props} contentContainerClassName="px-2 pb-4" contentContainerStyle={{ paddingTop: 4 }}>
        <GroupLabel>{t('SHELL.GROUP_OVERVIEW')}</GroupLabel>
        <DrawerNavLink href="/" label={t('SHELL.NAV_DASHBOARD')} icon={faHouse} exact />
        <DrawerNavLink href="/notifications" label={t('SHELL.NAV_NOTIFICATIONS')} icon={faBell} />

        <GroupLabel>{t('SHELL.GROUP_ACCOUNT')}</GroupLabel>
        <DrawerNavLink href="/settings/profile" label={t('SHELL.NAV_PROFILE')} icon={faCircleUser} />
        <DrawerNavLink href="/settings/sessions" label={t('SHELL.NAV_SESSIONS')} icon={faLaptop} />

        <GroupLabel>{t('SHELL.GROUP_ORGANIZATION')}</GroupLabel>
        <DrawerNavLink href="/settings/tenant/members" label={t('SHELL.NAV_MEMBERS')} icon={faUsers} />
        <DrawerNavLink href="/settings/tenant/invitations" label={t('SHELL.NAV_INVITATIONS')} icon={faEnvelopeOpenText} />
        <DrawerNavLink href="/settings" label={t('SHELL.NAV_SETTINGS')} icon={faGear} exact />
      </DrawerContentScrollView>

      {/* Footer: language + theme */}
      <View className="flex-row items-center gap-1 border-t border-border px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <LangSwitcher />
        <View className="ml-auto">
          <ThemeToggle />
        </View>
      </View>
    </View>
  );
}
