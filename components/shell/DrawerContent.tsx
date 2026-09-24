import { View, Text } from 'react-native';
import { DrawerContentScrollView } from 'expo-router/drawer';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faHome, faBell, faGear } from '@fortawesome/free-solid-svg-icons';
import { DrawerNavLink } from './DrawerNavLink';
import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '@/libs/theme/ThemeContext';

export function DrawerContent(props: DrawerContentComponentProps) {
  const { tokens: t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: t.surfaceRaised }}>

      {/* Brand header — 56pt + status bar */}
      <View
        style={{
          height: 56 + insets.top,
          paddingTop: insets.top,
          paddingHorizontal: 16,
          justifyContent: 'center',
          borderBottomWidth: 1,
          borderBottomColor: t.border,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: t.textPrimary }}>
          AppName
        </Text>
      </View>

      {/* Nav links */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 12 }}
        scrollEnabled={false}
      >
        <DrawerNavLink href="/"             label="Home"          icon={faHome} exact />
        <DrawerNavLink href="/notifications" label="Notifications" icon={faBell} />
        <DrawerNavLink href="/settings"      label="Settings"      icon={faGear} />
      </DrawerContentScrollView>

      {/* Footer: lang + theme */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: t.border,
        }}
      >
        <LangSwitcher />
        <View style={{ marginLeft: 'auto' }}>
          <ThemeToggle />
        </View>
      </View>
    </View>
  );
}
