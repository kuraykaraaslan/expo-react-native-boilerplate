import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useTenantStore } from "@/stores/tenantStore";
import { TenantClientService } from "@/services/TenantClientService";
import { extractErrorMessage } from "@/dto/common.dto";
import type { TenantMember } from "@/dto/tenant.dto";

export default function SelectTenantScreen() {
  const [memberships, setMemberships] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectMembership = useTenantStore((s) => s.selectMembership);
  const setMembershipsInStore = useTenantStore((s) => s.setMemberships);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { tenants } = await TenantClientService.getMyTenants();
        setMemberships(tenants);
        setMembershipsInStore(tenants);
      } catch (err: unknown) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [setMembershipsInStore]);

  function handleSelect(member: TenantMember) {
    selectMembership(member);
    router.replace("/");
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#f4511e" />
        <Text className="mt-4 text-gray-500 dark:text-gray-400">Loading workspaces...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-6 pt-12">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Select Workspace
      </Text>
      <Text className="text-gray-500 dark:text-gray-400 mb-8">
        Choose a workspace to continue
      </Text>

      {error && (
        <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <Text className="text-red-700 dark:text-red-400">{error}</Text>
        </View>
      )}

      <FlatList
        data={memberships}
        keyExtractor={(item) => item.tenantMemberId}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-3 bg-white dark:bg-gray-800"
            onPress={() => handleSelect(item)}
            accessible
            accessibilityLabel={`Select workspace: ${item.tenant?.name ?? item.tenantId}`}
            accessibilityRole="button"
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {item.tenant?.name ?? item.tenantId}
            </Text>
            {item.tenant?.description && (
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {item.tenant.description}
              </Text>
            )}
            <View className="flex-row items-center mt-2">
              <View className="bg-orange-100 dark:bg-orange-900/30 rounded-full px-2 py-0.5">
                <Text className="text-orange-600 dark:text-orange-400 text-xs font-medium">
                  {item.memberRole}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-gray-500 dark:text-gray-400">No workspaces found</Text>
          </View>
        }
      />
    </View>
  );
}
