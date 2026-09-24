import { View, Text } from 'react-native';
import { DrawerContentScrollView } from 'expo-router/drawer';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { faHome, faBell, faGear } from '@fortawesome/free-solid-svg-icons';
import { DrawerNavLink } from './DrawerNavLink';
import { LangSwitcher } from './LangSwitcher';
import { ThemeToggle } from './ThemeToggle';

export function DrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface-raised">

      {/* Brand header — 56pt + status bar */}
      <View
        className="justify-center px-4 border-b border-border"
        style={{ height: 56 + insets.top, paddingTop: insets.top }}
      >
        <Text className="text-base font-bold text-text-primary">AppName</Text>
      </View>

      {/* Nav links */}
      <DrawerContentScrollView
        {...props}
        contentContainerClassName="pt-2 px-3"
        scrollEnabled={false}
      >
        <DrawerNavLink href="/"             label="Home"          icon={faHome} exact />
        <DrawerNavLink href="/notifications" label="Notifications" icon={faBell} />
        <DrawerNavLink href="/settings"      label="Settings"      icon={faGear} />
      </DrawerContentScrollView>

      {/* Footer: lang + theme */}
      <View
        className="flex-row items-center gap-1 px-4 pt-3 border-t border-border"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <LangSwitcher />
        <View className="ml-auto">
          <ThemeToggle />
        </View>
      </View>
    </View>
  );
}
