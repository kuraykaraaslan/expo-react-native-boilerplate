import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faBell } from '@fortawesome/free-solid-svg-icons';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { useUnreadPolling } from '@/libs/useUnreadPolling';
import { useNotificationStore } from '@/stores/notificationStore';
import { Text } from '@/components/ui';
import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

type AppHeaderProps = {
  navigation: DrawerNavigationProp<any>;
  title?: string;
};

function NotificationBell() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const unread = useNotificationStore((s) => s.unreadCount);

  useUnreadPolling();

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={t('SHELL.NOTIFICATIONS_A11Y', { count: unread })}
      testID="shell-notifications-bell"
      className="h-9 w-9 items-center justify-center rounded-md active:bg-surface-overlay"
    >
      <FontAwesomeIcon icon={faBell} color={tokens['text-secondary']} size={16} />
      {unread > 0 ? (
        <View className="absolute right-0.5 top-0.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1">
          <Text className="text-[10px] font-bold text-text-inverse">{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function AppHeader({ navigation, title }: AppHeaderProps) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-2 border-b border-border bg-surface-raised px-2"
      style={{ height: 56 + insets.top, paddingTop: insets.top }}
    >
      {/* 1. Hamburger */}
      <Pressable
        onPress={() => navigation.openDrawer()}
        accessibilityRole="button"
        accessibilityLabel={t('SHELL.OPEN_MENU')}
        testID="shell-open-drawer"
        className="h-9 w-9 items-center justify-center rounded-md active:bg-surface-overlay"
      >
        <FontAwesomeIcon icon={faBars} color={tokens['text-secondary']} size={18} />
      </Pressable>

      {/* 2. Title / breadcrumb slot */}
      {title ? (
        <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-text-primary">
          {title}
        </Text>
      ) : (
        <View className="flex-1" />
      )}

      {/* 3. Right group — same order as next-boilerplate's top bar */}
      <View className="flex-row items-center gap-1">
        <LangSwitcher />
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </View>
    </View>
  );
}
