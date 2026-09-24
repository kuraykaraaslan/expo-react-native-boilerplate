import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useAuthStore } from '@/stores/authStore';
import { DrawerContent } from '@/components/shell/DrawerContent';
import { AppHeader } from '@/components/shell/AppHeader';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

export default function DrawerLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const t = useThemeTokens();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        drawerType:       'slide',
        drawerStyle:      { width: 256, backgroundColor: t['surface-raised'] },
        overlayColor:     'rgba(0,0,0,0.5)',
        swipeEnabled:     true,
        swipeEdgeWidth:   48,
        header:           () => <AppHeader navigation={navigation} />,
      })}
    >
      <Drawer.Screen name="index"         options={{ title: 'Home' }} />
      <Drawer.Screen name="notifications" options={{ title: 'Notifications' }} />
      {/* settings is a nested Stack — hide from drawer item list */}
      <Drawer.Screen
        name="settings"
        options={{ title: 'Settings', drawerItemStyle: { display: 'none' } }}
      />
    </Drawer>
  );
}
