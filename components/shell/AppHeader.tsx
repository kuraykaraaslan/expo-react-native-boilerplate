import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { useTheme } from '@/libs/theme/ThemeContext';

type AppHeaderProps = {
  navigation: DrawerNavigationProp<any>;
  title?: string;
};

export function AppHeader({ navigation, title }: AppHeaderProps) {
  const { tokens: t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        height: 56 + insets.top,
        paddingTop: insets.top,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: t.surfaceRaised,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
      }}
    >
      {/* 1. Hamburger */}
      <Pressable
        onPress={() => navigation.openDrawer()}
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
        style={({ pressed }) => ({
          padding: 6,
          borderRadius: 6,
          backgroundColor: pressed ? t.surfaceOverlay : 'transparent',
        })}
      >
        <FontAwesomeIcon icon={faBars} color={t.textSecondary} size={18} />
      </Pressable>

      {/* 2. Title / breadcrumb slot */}
      {title ? (
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 15, fontWeight: '600', color: t.textPrimary }}
        >
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* 3. Right group */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <LangSwitcher />
        <ThemeToggle />
        <UserMenu />
      </View>
    </View>
  );
}
