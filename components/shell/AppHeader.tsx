import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

type AppHeaderProps = {
  navigation: DrawerNavigationProp<any>;
  title?: string;
};

export function AppHeader({ navigation, title }: AppHeaderProps) {
  const t = useThemeTokens();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-2 px-3 bg-surface-raised border-b border-border"
      style={{ height: 56 + insets.top, paddingTop: insets.top }}
    >
      {/* 1. Hamburger */}
      <Pressable
        onPress={() => navigation.openDrawer()}
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        className="p-1.5 rounded-md active:bg-surface-overlay"
      >
        <FontAwesomeIcon icon={faBars} color={t['text-secondary']} size={18} />
      </Pressable>

      {/* 2. Title / breadcrumb slot */}
      {title ? (
        <Text numberOfLines={1} className="flex-1 text-[15px] font-semibold text-text-primary">
          {title}
        </Text>
      ) : (
        <View className="flex-1" />
      )}

      {/* 3. Right group */}
      <View className="flex-row items-center gap-1">
        <LangSwitcher />
        <ThemeToggle />
        <UserMenu />
      </View>
    </View>
  );
}
