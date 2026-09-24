import '../global.css';
import '@/libs/theme/brand'; // brand tokens before first render
import '@/libs/i18n'; // initialise i18next before any component renders
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import { Toaster } from 'sonner-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { getToken } from '@/libs/secureStorage';
import { AuthClientService } from '@/services/auth.service.client';
import { ThemeProvider } from '@/libs/theme/ThemeContext';
import i18n from '@/libs/i18n';
import logger from '@/libs/logger';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const ready = loaded || Boolean(fontError); // fall back to system fonts rather than block the app

  const setUser          = useAuthStore((s) => s.setUser);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const locale           = useAppStore((s) => s.locale);

  // Sync persisted locale → i18next on mount
  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  // Restore session from stored tokens on app startup
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await getToken('accessToken');
        if (!token) {
          setAuthenticated(false);
          return;
        }
        const user = await AuthClientService.getSession();
        setUser(user);
      } catch {
        logger.warn('Session restore failed');
        setAuthenticated(false);
      }
    }
    restoreSession();
  }, [setUser, setAuthenticated]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Slot />
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
