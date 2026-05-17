import { useState, useCallback, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { NotificationClientService } from "@/services/NotificationClientService";
import { extractErrorMessage } from "@/dto/common.dto";
import type { Notification } from "@/dto/notification.dto";

function NotificationItem({ item }: { item: Notification }) {
  const typeColors: Record<string, string> = {
    INFO: "bg-blue-100 dark:bg-blue-900/30",
    SUCCESS: "bg-green-100 dark:bg-green-900/30",
    WARNING: "bg-yellow-100 dark:bg-yellow-900/30",
    ERROR: "bg-red-100 dark:bg-red-900/30",
    SYSTEM: "bg-gray-100 dark:bg-gray-800",
  };
  const dotColors: Record<string, string> = {
    INFO: "bg-blue-500",
    SUCCESS: "bg-green-500",
    WARNING: "bg-yellow-500",
    ERROR: "bg-red-500",
    SYSTEM: "bg-gray-500",
  };

  return (
    <View
      className={`mx-4 mb-3 rounded-xl p-4 ${typeColors[item.type] ?? typeColors.INFO} ${!item.isRead ? "border-l-4 border-orange-500" : ""}`}
    >
      <View className="flex-row items-start">
        <View className={`w-2 h-2 rounded-full mt-1.5 mr-3 ${dotColors[item.type] ?? dotColors.INFO}`} />
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 dark:text-white text-sm">{item.title}</Text>
          {item.message && (
            <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">{item.message}</Text>
          )}
          {item.createdAt && (
            <Text className="text-gray-400 dark:text-gray-500 text-xs mt-2">
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const { notifications, hasNext } = await NotificationClientService.getNotifications(pageNum);
      if (pageNum === 1) {
        setData(notifications);
      } else {
        setData((prev) => [...prev, ...notifications]);
      }
      setHasMore(hasNext);
      setPage(pageNum);
    } catch {
      // silently fail on background refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <FlatList
        data={data}
        keyExtractor={(item) => item.notificationId}
        renderItem={({ item }) => <NotificationItem item={item} />}
        onRefresh={() => fetchPage(1)}
        refreshing={loading && data.length === 0}
        onEndReached={() => { if (!loading && hasMore) fetchPage(page + 1); }}
        onEndReachedThreshold={0.3}
        contentContainerClassName="pt-4 pb-8"
        ListEmptyComponent={
          loading ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#f4511e" />
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-gray-400 dark:text-gray-500 text-base">No notifications</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && data.length > 0 ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#f4511e" />
            </View>
          ) : null
        }
      />
    </View>
  );
}
