import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { AuthClientService } from "@/services/AuthClientService";
import { clearAllTokens } from "@/libs/secureStorage";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faBuilding, faRightFromBracket, faUser } from "@fortawesome/free-solid-svg-icons";
import logger from "@/libs/logger";

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const selectedTenant = useTenantStore((s) => s.selectedTenantMembership);
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
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-950"
      contentContainerClassName="px-4 py-6"
    >
      <View className="bg-orange-500 rounded-2xl p-6 mb-6">
        <View className="flex-row items-center mb-2">
          <FontAwesomeIcon icon={faBuilding} color="#ffffff" size={20} />
          <Text className="text-orange-100 text-sm ml-2">Current workspace</Text>
        </View>
        <Text className="text-white text-2xl font-bold">
          {selectedTenant?.tenant?.name ?? "No workspace selected"}
        </Text>
        {selectedTenant && (
          <View className="mt-2 bg-orange-600 rounded-full self-start px-3 py-1">
            <Text className="text-white text-xs font-medium">{selectedTenant.memberRole}</Text>
          </View>
        )}
      </View>

      <View className="bg-white dark:bg-gray-900 rounded-2xl p-6 mb-4 border border-gray-100 dark:border-gray-800">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 items-center justify-center mr-4">
            <FontAwesomeIcon icon={faUser} color="#f4511e" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {user?.name ?? "User"}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">{user?.email ?? ""}</Text>
          </View>
        </View>
      </View>

      <View className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </Text>
        <TouchableOpacity
          className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-800"
          onPress={() => router.push("/select-tenant")}
          accessible
          accessibilityLabel="Switch workspace"
          accessibilityRole="button"
        >
          <FontAwesomeIcon icon={faBuilding} color="#6b7280" size={16} />
          <Text className="ml-3 text-gray-700 dark:text-gray-300">Switch Workspace</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center py-3"
          onPress={handleLogout}
          accessible
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <FontAwesomeIcon icon={faRightFromBracket} color="#ef4444" size={16} />
          <Text className="ml-3 text-red-500">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
