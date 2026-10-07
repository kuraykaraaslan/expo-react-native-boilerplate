import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';
import { DrawerContent } from '@/components/shell/DrawerContent';
import { AppHeader } from '@/components/shell/AppHeader';
import { pullPreferences } from '@/libs/preferences';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

export default function DrawerLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const otpRequired = useAuthStore((s) => s.otpRequired);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const needsTenantSelection = useTenantStore((s) => s.needsTenantSelection);
  const t = useThemeTokens();
  const open = isAuthenticated && !otpRequired && !mustChangePassword;

  // Adopt the account's language and theme once the session is fully open.
  useEffect(() => {
    if (open) void pullPreferences();
  }, [open]);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }
  // The server's OTP gate is closed for this session (401 OTP_REQUIRED).
  if (otpRequired) {
    return <Redirect href="/2fa" />;
  }
  // Expired or admin-forced password: nothing else is reachable until it is changed.
  if (mustChangePassword) {
    return <Redirect href="/change-password" />;
  }
  // The active organization became unusable but the device holds another session: pick one.
  if (needsTenantSelection) {
    return <Redirect href="/select-tenant" />;
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
