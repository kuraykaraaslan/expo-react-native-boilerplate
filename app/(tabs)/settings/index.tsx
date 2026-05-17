import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { AuthClientService } from "@/services/AuthClientService";
import { clearAllTokens } from "@/libs/secureStorage";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faEnvelope, faGlobe, faUser,
  faShield, faRightFromBracket, faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import logger from "@/libs/logger";

interface SettingItem {
  icon: any;
  label: string;
  route: string;
}

const SETTINGS: SettingItem[] = [
  { icon: faEnvelope, label: "Change Email", route: "/settings/change-email" },
  { icon: faGlobe, label: "Language", route: "/settings/change-language" },
  { icon: faShield, label: "Active Sessions", route: "/settings/sessions" },
];

export default function SettingsIndexScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const flushTenant = useTenantStore((s) => s.flush);

  async function handleLogout() {
    try {
      await AuthClientService.logout();
    } catch {
      logger.warn("Server logout failed, clearing local state anyway");
    }
    await clearAllTokens();
    logout();
    flushTenant();
    router.replace("/login");
    toast.success("Logged out successfully");
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-950" contentContainerClassName="pb-8">
      <View className="bg-orange-500 px-6 pt-6 pb-8">
        <View className="w-16 h-16 rounded-full bg-orange-400 items-center justify-center mb-3">
          <FontAwesomeIcon icon={faUser} color="#ffffff" size={28} />
        </View>
        <Text className="text-white text-xl font-bold">{user?.name ?? "User"}</Text>
        <Text className="text-orange-100 text-sm">{user?.email ?? ""}</Text>
      </View>

      <View className="bg-white dark:bg-gray-900 mx-4 -mt-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-4">
        {SETTINGS.map((item, idx) => (
          <TouchableOpacity
            key={item.route}
            className={`flex-row items-center px-4 py-4 ${idx < SETTINGS.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
            onPress={() => router.push(item.route as any)}
            accessible
            accessibilityLabel={item.label}
            accessibilityRole="button"
          >
            <View className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 items-center justify-center mr-3">
              <FontAwesomeIcon icon={item.icon} color="#f4511e" size={14} />
            </View>
            <Text className="flex-1 text-gray-700 dark:text-gray-300 font-medium">{item.label}</Text>
            <FontAwesomeIcon icon={faChevronRight} color="#9ca3af" size={12} />
          </TouchableOpacity>
        ))}
      </View>

      <View className="bg-white dark:bg-gray-900 mx-4 rounded-2xl border border-gray-100 dark:border-gray-800">
        <TouchableOpacity
          className="flex-row items-center px-4 py-4"
          onPress={handleLogout}
          accessible
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <View className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 items-center justify-center mr-3">
            <FontAwesomeIcon icon={faRightFromBracket} color="#ef4444" size={14} />
          </View>
          <Text className="text-red-500 font-medium">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
