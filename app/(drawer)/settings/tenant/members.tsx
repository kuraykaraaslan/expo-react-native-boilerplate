import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { useTenantStore } from "@/stores/tenantStore";
import { TenantClientService } from "@/services/tenant.service.client";
import { handleApiError } from "@/libs/errorUtils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faTrash, faUser, faCrown, faShield } from "@fortawesome/free-solid-svg-icons";
import type { TenantMember } from "@/dto/tenant.dto";

const ROLE_ICON: Record<string, any> = {
  OWNER: faCrown,
  ADMIN: faShield,
  USER: faUser,
};

const ROLE_COLOR: Record<string, string> = {
  OWNER: "#f59e0b",
  ADMIN: "#3b82f6",
  USER: "#6b7280",
};

function MemberItem({
  item,
  currentMemberId,
  isAdmin,
  onRemove,
}: Readonly<{
  item: TenantMember;
  currentMemberId: string;
  isAdmin: boolean;
  onRemove: (id: string, name: string) => void;
}>) {
  const displayName = item.user?.userProfile?.name ?? item.user?.email ?? item.userId;
  const isCurrentUser = item.tenantMemberId === currentMemberId;
  const canRemove = isAdmin && !isCurrentUser && item.memberRole !== "OWNER";

  return (
    <View className="bg-white dark:bg-gray-900 mx-4 mb-3 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mr-3">
            <FontAwesomeIcon
              icon={ROLE_ICON[item.memberRole] ?? faUser}
              color={ROLE_COLOR[item.memberRole] ?? "#6b7280"}
              size={16}
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-medium text-gray-900 dark:text-white">{displayName}</Text>
              {isCurrentUser && (
                <View className="bg-orange-100 dark:bg-orange-900/30 rounded-full px-2 py-0.5">
                  <Text className="text-orange-600 dark:text-orange-400 text-xs">You</Text>
                </View>
              )}
            </View>
            {item.user?.email && (
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.user.email}</Text>
            )}
            <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
              {item.memberRole.toLowerCase()} · {item.memberStatus.toLowerCase()}
            </Text>
          </View>
        </View>
        {canRemove && (
          <TouchableOpacity
            className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center"
            onPress={() => onRemove(item.tenantMemberId, displayName)}
            accessible
            accessibilityLabel={`Remove ${displayName}`}
            accessibilityRole="button"
          >
            <FontAwesomeIcon icon={faTrash} color="#ef4444" size={12} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function MembersScreen() {
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = membership?.memberRole === "ADMIN" || membership?.memberRole === "OWNER";

  const load = useCallback(async () => {
    if (!membership) return;
    setLoading(true);
    try {
      const { members: list } = await TenantClientService.getMembers(membership.tenantId);
      setMembers(list);
    } catch (err: unknown) {
      handleApiError(err, "MembersScreen.load");
    } finally {
      setLoading(false);
    }
  }, [membership]);

  useEffect(() => { load(); }, [load]);

  function confirmRemove(memberId: string, displayName: string) {
    Alert.alert(
      "Remove Member",
      `Remove ${displayName} from this workspace?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!membership) return;
            try {
              await TenantClientService.removeMember(membership.tenantId, memberId);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              toast.success("Member removed");
              setMembers((prev) => prev.filter((m) => m.tenantMemberId !== memberId));
            } catch (err: unknown) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              handleApiError(err, "MembersScreen.remove");
            }
          },
        },
      ]
    );
  }

  if (!membership) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950 p-8">
        <Text className="text-gray-500 dark:text-gray-400 text-center">No workspace selected.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <FlatList
        data={members}
        keyExtractor={(item) => item.tenantMemberId}
        renderItem={({ item }) => (
          <MemberItem
            item={item}
            currentMemberId={membership.tenantMemberId}
            isAdmin={isAdmin}
            onRemove={confirmRemove}
          />
        )}
        onRefresh={load}
        refreshing={loading && members.length === 0}
        contentContainerClassName="pt-4 pb-8"
        ListHeaderComponent={
          <View className="px-4 mb-3">
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              {members.length} {members.length === 1 ? "member" : "members"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-20">
              <LoadingSpinner />
            </View>
          ) : (
            <View className="items-center py-20">
              <Text className="text-gray-400">No members found</Text>
            </View>
          )
        }
      />
    </View>
  );
}
