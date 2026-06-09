import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from "react-native";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { useTenantStore } from "@/stores/tenantStore";
import { TenantClientService } from "@/services/tenant.service.client";
import { handleApiError } from "@/libs/errorUtils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faTrash, faPaperPlane, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import type { Invitation } from "@/dto/tenant.dto";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  ACCEPTED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  DECLINED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  EXPIRED: "bg-gray-100 dark:bg-gray-800 text-gray-500",
  REVOKED: "bg-gray-100 dark:bg-gray-800 text-gray-500",
};

function InvitationItem({
  item,
  onRevoke,
}: Readonly<{ item: Invitation; onRevoke: (id: string) => void }>) {
  const statusClass = STATUS_COLOR[item.status] ?? STATUS_COLOR.EXPIRED;
  const canRevoke = item.status === "PENDING";

  return (
    <View className="bg-white dark:bg-gray-900 mx-4 mb-3 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mr-3">
            <FontAwesomeIcon icon={faEnvelope} color="#6b7280" size={16} />
          </View>
          <View className="flex-1">
            <Text className="font-medium text-gray-900 dark:text-white">{item.email ?? "—"}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
              {item.memberRole.toLowerCase()} role
            </Text>
            {item.expiresAt && (
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Expires {new Date(item.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        <View className="items-end gap-2">
          <View className={`rounded-full px-2 py-0.5 ${statusClass}`}>
            <Text className={`text-xs font-medium ${statusClass}`}>{item.status}</Text>
          </View>
          {canRevoke && (
            <TouchableOpacity
              className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center"
              onPress={() => onRevoke(item.invitationId)}
              accessible
              accessibilityLabel="Revoke invitation"
              accessibilityRole="button"
            >
              <FontAwesomeIcon icon={faTrash} color="#ef4444" size={11} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function InvitationsScreen() {
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!membership) return;
    setLoading(true);
    try {
      const { invitations: list } = await TenantClientService.getInvitations(membership.tenantId);
      setInvitations(list);
    } catch (err: unknown) {
      handleApiError(err, "InvitationsScreen.load");
    } finally {
      setLoading(false);
    }
  }, [membership]);

  useEffect(() => { load(); }, [load]);

  async function handleSend() {
    if (!membership || !email.trim()) return;
    setSending(true);
    try {
      await TenantClientService.sendInvitation(membership.tenantId, {
        email: email.trim(),
        memberRole: "USER",
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Invitation sent");
      setEmail("");
      load();
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, "InvitationsScreen.send");
    } finally {
      setSending(false);
    }
  }

  function confirmRevoke(invitationId: string) {
    Alert.alert(
      "Revoke Invitation",
      "Are you sure you want to revoke this invitation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            if (!membership) return;
            try {
              await TenantClientService.revokeInvitation(membership.tenantId, invitationId);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              toast.success("Invitation revoked");
              setInvitations((prev) => prev.filter((i) => i.invitationId !== invitationId));
            } catch (err: unknown) {
              handleApiError(err, "InvitationsScreen.revoke");
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
      {/* Send invitation form */}
      <View className="bg-white dark:bg-gray-900 mx-4 mt-4 mb-2 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Invite by Email
        </Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
            value={email}
            onChangeText={setEmail}
            placeholder="colleague@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            className={`rounded-xl px-4 items-center justify-center ${
              sending || !email.trim() ? "bg-orange-300" : "bg-orange-500"
            }`}
            onPress={handleSend}
            disabled={sending || !email.trim()}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} color="#ffffff" size={16} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={invitations}
        keyExtractor={(item) => item.invitationId}
        renderItem={({ item }) => (
          <InvitationItem item={item} onRevoke={confirmRevoke} />
        )}
        onRefresh={load}
        refreshing={loading && invitations.length === 0}
        contentContainerClassName="pt-2 pb-8"
        ListHeaderComponent={
          invitations.length > 0 ? (
            <View className="px-4 mb-3">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">
                {invitations.length} {invitations.length === 1 ? "invitation" : "invitations"}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-16">
              <LoadingSpinner />
            </View>
          ) : (
            <View className="items-center py-16">
              <Text className="text-gray-400">No invitations yet</Text>
            </View>
          )
        }
      />
    </View>
  );
}
