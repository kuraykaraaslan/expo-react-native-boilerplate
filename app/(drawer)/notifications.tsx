import { useState, useCallback, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { toast } from "sonner-native";
import * as Haptics from "expo-haptics";
import { NotificationClientService } from "@/services/notification.service.client";
import { handleApiError } from "@/libs/errorUtils";
import { Spinner } from "@/components/ui";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCheckDouble, faTrash } from "@fortawesome/free-solid-svg-icons";
import type { Notification } from "@/dto/notification.dto";

function NotificationItem({
  item,
  onMarkRead,
}: Readonly<{
  item: Notification;
  onMarkRead: (id: string) => void;
}>) {
  const isUnread = !item.isRead;
  return (
    <TouchableOpacity
      className={`mx-4 mb-3 rounded-xl p-4 bg-white dark:bg-gray-900 border ${
        isUnread
          ? "border-orange-300 dark:border-orange-700 border-l-4 border-l-orange-500"
          : "border-gray-100 dark:border-gray-800"
      }`}
      onPress={() => { if (isUnread) onMarkRead(item.notificationId); }}
      activeOpacity={isUnread ? 0.7 : 1}
    >
      <View className="flex-row items-start">
        {isUnread && (
          <View className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 mr-3 flex-shrink-0" />
        )}
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
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const notifications = await NotificationClientService.getNotifications();
      setData(notifications);
    } catch (err: unknown) {
      handleApiError(err, "NotificationsScreen.fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleMarkRead(notificationId: string) {
    try {
      await NotificationClientService.markAsRead(notificationId);
      setData((prev) =>
        prev.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (err: unknown) {
      handleApiError(err, "NotificationsScreen.markRead");
    }
  }

  async function handleMarkAllRead() {
    try {
      await NotificationClientService.markAllAsRead();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setData((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (err: unknown) {
      handleApiError(err, "NotificationsScreen.markAllRead");
    }
  }

  function handleClearAll() {
    Alert.alert(
      "Clear All Notifications",
      "This will permanently delete all your notifications. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await NotificationClientService.clearAll();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setData([]);
              toast.success("All notifications cleared");
            } catch (err: unknown) {
              handleApiError(err, "NotificationsScreen.clearAll");
            }
          },
        },
      ]
    );
  }

  const hasUnread = data.some((n) => !n.isRead);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {data.length > 0 && (
        <View className="flex-row px-4 pt-4 gap-3 mb-1">
          {hasUnread && (
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-orange-500 rounded-xl py-2.5 gap-2"
              onPress={handleMarkAllRead}
            >
              <FontAwesomeIcon icon={faCheckDouble} color="#ffffff" size={14} />
              <Text className="text-white font-semibold text-sm">Mark All Read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-red-500 rounded-xl py-2.5 gap-2"
            onPress={handleClearAll}
          >
            <FontAwesomeIcon icon={faTrash} color="#ffffff" size={14} />
            <Text className="text-white font-semibold text-sm">Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={data}
        keyExtractor={(item) => item.notificationId}
        renderItem={({ item }) => (
          <NotificationItem item={item} onMarkRead={handleMarkRead} />
        )}
        onRefresh={fetchAll}
        refreshing={loading && data.length === 0}
        contentContainerClassName="pt-4 pb-8"
        ListEmptyComponent={
          loading ? (
            <View className="flex-1 items-center justify-center py-20">
              <Spinner size="lg" />
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-gray-400 dark:text-gray-500 text-base">No notifications</Text>
            </View>
          )
        }
      />
    </View>
  );
}
