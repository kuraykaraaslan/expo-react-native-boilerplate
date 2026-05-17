import "../global.css";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Slot } from "expo-router";
import { Toaster } from "sonner-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/stores/authStore";
import { getToken } from "@/libs/secureStorage";
import { AuthClientService } from "@/services/AuthClientService";
import logger from "@/libs/logger";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({});

  const setUser = useAuthStore((s) => s.setUser);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  // Restore session from stored tokens on app startup
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await getToken("accessToken");
        if (!token) {
          setAuthenticated(false);
          return;
        }

        const user = await AuthClientService.getSession();
        setUser(user);
      } catch {
        logger.warn("Session restore failed");
        setAuthenticated(false);
      }
    }

    restoreSession();
  }, [setUser, setAuthenticated]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
        <Toaster position="bottom-center" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
