import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { AuthClientService } from "@/services/auth.service.client";
import { extractErrorMessage } from "@/dto/common.dto";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faTrash, faLaptop } from "@fortawesome/free-solid-svg-icons";
import type { Session } from "@/dto/auth.dto";

function SessionItem({
  item,
  onRevoke,
}: Readonly<{ item: Session; onRevoke: (id: string) => void }>) {
  const truncated = item.userAgent && item.userAgent.length > 50
    ? item.userAgent.slice(0, 50) + "…"
    : item.userAgent;
  const agentLabel = truncated ?? "Unknown Device";

  return (
    <View className="bg-white dark:bg-gray-900 mx-4 mb-3 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mr-3">
            <FontAwesomeIcon icon={faLaptop} color="#6b7280" size={16} />
          </View>
          <View className="flex-1">
            <Text className="font-medium text-gray-900 dark:text-white text-sm" numberOfLines={2}>
              {agentLabel}
            </Text>
            {item.ipAddress && (
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.ipAddress}</Text>
            )}
            {item.createdAt && (
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center ml-2"
          onPress={() => onRevoke(item.userSessionId)}
          accessible
          accessibilityLabel="Revoke session"
          accessibilityRole="button"
        >
          <FontAwesomeIcon icon={faTrash} color="#ef4444" size={12} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AuthClientService.getSessions();
      setSessions(data);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function revokeSession(sessionId: string) {
    try {
      await AuthClientService.revokeSession(sessionId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success("Session revoked");
      setSessions((prev) => prev.filter((s) => s.userSessionId !== sessionId));
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(extractErrorMessage(err));
    }
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.userSessionId}
        renderItem={({ item }) => <SessionItem item={item} onRevoke={revokeSession} />}
        onRefresh={load}
        refreshing={loading && sessions.length === 0}
        contentContainerClassName="pt-4 pb-8"
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-20">
              <ActivityIndicator size="large" color="#f4511e" />
            </View>
          ) : (
            <View className="items-center py-20">
              <Text className="text-gray-400">No active sessions</Text>
            </View>
          )
        }
      />
    </View>
  );
}
