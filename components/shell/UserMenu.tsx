import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleUser, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { Avatar, DropdownMenu } from '@/components/ui';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { logout } from '@/libs/logout';
import { useAuthStore } from '@/stores/authStore';

/** next-boilerplate's user menu: avatar trigger; name + email header; My Profile, Sign out. */
export function UserMenu() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const name = user?.name ?? user?.email ?? '';

  return (
    <DropdownMenu
      align="right"
      trigger={
        // Must be a Pressable: DropdownMenu injects onPress into the trigger element.
        <Pressable accessibilityRole="button" accessibilityLabel={t('SHELL.USER_MENU_A11Y', { name })} testID="shell-user-menu-trigger" className="p-1">
          <Avatar name={name || '?'} src={user?.image ?? undefined} size="sm" />
        </Pressable>
      }
      header={
        <View className="max-w-[240px] px-3 py-2">
          <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
            {user?.name ?? user?.email}
          </Text>
          {user?.name && user?.email ? (
            <Text className="text-xs text-text-secondary" numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
        </View>
      }
      items={[
        {
          label: t('SHELL.MY_PROFILE'),
          icon: <FontAwesomeIcon icon={faCircleUser} size={14} color={tokens['text-secondary']} />,
          onPress: () => router.push('/settings/profile'),
        },
        { type: 'separator' },
        {
          label: t('SHELL.SIGN_OUT'),
          icon: <FontAwesomeIcon icon={faRightFromBracket} size={14} color={tokens.error} />,
          danger: true,
          onPress: logout,
        },
      ]}
    />
  );
}
