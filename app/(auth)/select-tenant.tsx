import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTenantStore } from "@/stores/tenantStore";
import { TenantClientService } from "@/services/tenant.service.client";
import { handleApiError } from "@/libs/errorUtils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import type { TenantMember } from "@/dto/tenant.dto";

export default function SelectTenantScreen() {
  const [memberships, setMemberships] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(false);
  const selectMembership = useTenantStore((s) => s.selectMembership);
  const setMembershipsInStore = useTenantStore((s) => s.setMemberships);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { tenants } = await TenantClientService.getMyTenants();
        setMemberships(tenants);
        setMembershipsInStore(tenants);
      } catch (err: unknown) {
        handleApiError(err, "SelectTenantScreen");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [setMembershipsInStore]);

  async function handleSelect(member: TenantMember) {
    selectMembership(member);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/");
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <LoadingSpinner label="Loading workspaces..." />
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
                <Text className="text-orange-600 dark:text-orange-400 text-xs font-medium capitalize">
                  {item.memberRole.toLowerCase()}
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
        ListFooterComponent={
          <TouchableOpacity
            className="flex-row items-center justify-center border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-xl p-4 mb-3 mt-1"
            onPress={() => router.push("/create-tenant")}
            accessible
            accessibilityLabel="Create a new workspace"
            accessibilityRole="button"
          >
            <FontAwesomeIcon icon={faPlus} color="#f97316" size={14} />
            <Text className="text-orange-500 font-semibold ml-2">Create New Workspace</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}
