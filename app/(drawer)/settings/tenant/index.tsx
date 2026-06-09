import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useTenantStore } from "@/stores/tenantStore";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faUsers, faEnvelope, faChevronRight,
  faBuilding, faCrown, faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "@/libs/theme/ThemeContext";

const ROLE_ICON: Record<string, any> = {
  OWNER: faCrown,
  ADMIN: faUser,
  USER: faUser,
};

const ROLE_COLOR: Record<string, string> = {
  OWNER: "#f59e0b",
  ADMIN: "#3b82f6",
  USER: "#6b7280",
};

interface TenantMenuItem {
  icon: any;
  label: string;
  description: string;
  route: string;
  requiresAdmin?: boolean;
}

const MENU_ITEMS: TenantMenuItem[] = [
  {
    icon: faUsers,
    label: "Members",
    description: "View and manage workspace members",
    route: "/settings/tenant/members",
  },
  {
    icon: faEnvelope,
    label: "Invitations",
    description: "Send and manage invitations",
    route: "/settings/tenant/invitations",
    requiresAdmin: true,
  },
];

export default function TenantScreen() {
  const { tokens: t } = useTheme();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const isAdmin = membership?.memberRole === "ADMIN" || membership?.memberRole === "OWNER";

  if (!membership) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <Text className="text-gray-500 dark:text-gray-400 text-center">
          No workspace selected. Please select a workspace first.
        </Text>
      </View>
    );
  }

  const visibleItems = MENU_ITEMS.filter((item) => !item.requiresAdmin || isAdmin);

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-950" contentContainerClassName="pb-8">
      {/* Workspace header */}
      <View className="bg-orange-500 px-6 pt-6 pb-8 mb-4">
        <View className="w-14 h-14 rounded-2xl bg-orange-400 items-center justify-center mb-3">
          <FontAwesomeIcon icon={faBuilding} color="#ffffff" size={24} />
        </View>
        <Text className="text-white text-xl font-bold">{membership.tenant?.name ?? "Workspace"}</Text>
        {membership.tenant?.description && (
          <Text className="text-orange-100 text-sm mt-1">{membership.tenant.description}</Text>
        )}
        <View className="flex-row items-center mt-3">
          <FontAwesomeIcon
            icon={ROLE_ICON[membership.memberRole] ?? faUser}
            color={ROLE_COLOR[membership.memberRole] ?? "#ffffff"}
            size={12}
          />
          <Text className="text-orange-100 text-xs ml-1.5 capitalize">
            {membership.memberRole.toLowerCase()} role
          </Text>
        </View>
      </View>

      <View className="bg-white dark:bg-gray-900 mx-4 rounded-2xl border border-gray-100 dark:border-gray-800">
        {visibleItems.map((item, idx) => (
          <TouchableOpacity
            key={item.route}
            className={`flex-row items-center px-4 py-4 ${
              idx < visibleItems.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""
            }`}
            onPress={() => router.push(item.route as any)}
            accessible
            accessibilityLabel={item.label}
            accessibilityRole="button"
          >
            <View className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 items-center justify-center mr-3">
              <FontAwesomeIcon icon={item.icon} color={t.primary} size={16} />
            </View>
            <View className="flex-1">
              <Text className="text-gray-800 dark:text-white font-medium">{item.label}</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{item.description}</Text>
            </View>
            <FontAwesomeIcon icon={faChevronRight} color="#9ca3af" size={12} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
