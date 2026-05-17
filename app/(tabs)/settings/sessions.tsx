import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { AuthClientService } from "@/services/AuthClientService";
import { extractErrorMessage } from "@/dto/common.dto";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faTrash, faLaptop, faMobile } from "@fortawesome/free-solid-svg-icons";
import type { Session } from "@/dto/auth.dto";

function SessionItem({ item, onRevoke }: { item: Session; onRevoke: (id: string) => void }) {
  const icon = item.platform?.toLowerCase().includes("mobile") ? faMobile : faLaptop;

  return (
    <View className="bg-white dark:bg-gray-900 mx-4 mb-3 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mr-3">
            <FontAwesomeIcon icon={icon} color="#6b7280" size={16} />
          </View>
          <View className="flex-1">
            <Text className="font-medium text-gray-900 dark:text-white">
              {item.device ?? item.platform ?? "Unknown Device"}
            </Text>
            {item.city && item.country && (
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {item.city}, {item.country}
              </Text>
            )}
            {item.ip && (
              <Text className="text-xs text-gray-400 dark:text-gray-500">{item.ip}</Text>
            )}
          </View>
        </View>
        {item.sessionId && !item.isCurrentSession && (
          <TouchableOpacity
            className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center"
            onPress={() => onRevoke(item.sessionId!)}
            accessible
            accessibilityLabel="Revoke session"
            accessibilityRole="button"
          >
            <FontAwesomeIcon icon={faTrash} color="#ef4444" size={12} />
          </TouchableOpacity>
        )}
        {item.isCurrentSession && (
          <View className="bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-0.5">
            <Text className="text-green-600 dark:text-green-400 text-xs">Current</Text>
          </View>
        )}
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
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(extractErrorMessage(err));
    }
  }

  function handleRevokeAll() {
    Alert.alert(
      "Revoke All Sessions",
      "This will sign you out from all other devices. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke All",
          style: "destructive",
          onPress: async () => {
            try {
              await AuthClientService.revokeAllSessions();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              toast.success("All sessions revoked");
              setSessions([]);
            } catch (err: unknown) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              toast.error(extractErrorMessage(err));
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {sessions.length > 1 && (
        <View className="px-4 pt-4">
          <TouchableOpacity
            className="bg-red-500 rounded-xl py-3 items-center mb-4"
            onPress={handleRevokeAll}
            accessible
            accessibilityLabel="Revoke all sessions"
            accessibilityRole="button"
          >
            <Text className="text-white font-semibold">Revoke All Other Sessions</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={sessions}
        keyExtractor={(_, i) => i.toString()}
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
