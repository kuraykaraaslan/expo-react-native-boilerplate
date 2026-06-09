import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useTenantStore } from "@/stores/tenantStore";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faEnvelope, faGlobe, faUser,
  faShield, faRightFromBracket, faChevronRight,
  faBuilding, faUserPen,
} from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "@/libs/theme/ThemeContext";
import { logout } from "@/libs/logout";

interface SettingItem {
  icon: any;
  label: string;
  route: string;
}

const ACCOUNT_SETTINGS: SettingItem[] = [
  { icon: faUserPen, label: "Edit Profile", route: "/settings/profile" },
  { icon: faEnvelope, label: "Change Email", route: "/settings/change-email" },
  { icon: faGlobe, label: "Language", route: "/settings/change-language" },
  { icon: faShield, label: "Active Sessions", route: "/settings/sessions" },
];

const WORKSPACE_SETTINGS: SettingItem[] = [
  { icon: faBuilding, label: "Workspace", route: "/settings/tenant" },
];

function SettingsGroup({ title, items }: Readonly<{ title: string; items: SettingItem[] }>) {
  const { tokens: t } = useTheme();
  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 mb-2">
        {title}
      </Text>
      <View className="bg-white dark:bg-gray-900 mx-4 rounded-2xl border border-gray-100 dark:border-gray-800">
        {items.map((item, idx) => (
          <TouchableOpacity
            key={item.route}
            className={`flex-row items-center px-4 py-4 ${idx < items.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
            onPress={() => router.push(item.route as any)}
            accessible
            accessibilityLabel={item.label}
            accessibilityRole="button"
          >
            <View className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 items-center justify-center mr-3">
              <FontAwesomeIcon icon={item.icon} color={t.primary} size={14} />
            </View>
            <Text className="flex-1 text-gray-700 dark:text-gray-300 font-medium">{item.label}</Text>
            <FontAwesomeIcon icon={faChevronRight} color="#9ca3af" size={12} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsIndexScreen() {
  const user = useAuthStore((s) => s.user);
  const selectedTenant = useTenantStore((s) => s.selectedTenantMembership);
  const handleLogout = logout;

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-950" contentContainerClassName="pb-8">
      {/* Profile header */}
      <View className="bg-orange-500 px-6 pt-6 pb-8">
        <View className="w-16 h-16 rounded-full bg-orange-400 items-center justify-center mb-3">
          <FontAwesomeIcon icon={faUser} color="#ffffff" size={28} />
        </View>
        <Text className="text-white text-xl font-bold">{user?.name ?? "User"}</Text>
        <Text className="text-orange-100 text-sm">{user?.email ?? ""}</Text>
        {selectedTenant?.tenant && (
          <View className="flex-row items-center mt-2 bg-orange-400/50 rounded-full px-3 py-1 self-start">
            <FontAwesomeIcon icon={faBuilding} color="#fff" size={10} />
            <Text className="text-white text-xs ml-1.5">{selectedTenant.tenant.name}</Text>
          </View>
        )}
      </View>

      <View className="-mt-4 pt-4">
        <SettingsGroup title="Account" items={ACCOUNT_SETTINGS} />
        <SettingsGroup title="Workspace" items={WORKSPACE_SETTINGS} />
      </View>

      {/* Sign out */}
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
