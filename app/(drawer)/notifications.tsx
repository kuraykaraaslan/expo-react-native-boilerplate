import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { toast } from 'sonner-native';
import { faBellSlash } from '@fortawesome/free-solid-svg-icons';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Screen, useListContentStyle } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Button, EmptyState, Spinner, Text } from '@/components/ui';
import type { Notification } from '@/services/user/notification.dto';
import { env } from '@/libs/env';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { NotificationClientService } from '@/services/user/notification.service.client';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTenantStore } from '@/stores/tenantStore';
import { cn } from '@/utils/cn';
import { formatRelative } from '@/utils/format';
import { notificationTarget } from '@/utils/notification';

function NotificationRow({ item, onPress }: { item: Notification; onPress: () => void }) {
  const { t } = useTranslation();
  const unread = !item.isRead;
  const hasTarget = notificationTarget(item, env.EXPO_PUBLIC_FRONTEND_URL) !== null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!unread && !hasTarget}
      accessibilityRole="button"
      accessibilityLabel={unread ? t('NOTIFICATIONS.UNREAD_A11Y', { title: item.title }) : item.title}
      accessibilityState={{ disabled: !unread && !hasTarget }}
      testID={`notifications-row-${item.notificationId}`}
      className={cn('flex-row gap-3 px-4 py-3', unread && 'bg-primary-subtle/40')}
    >
      <View className={cn('mt-1.5 h-2 w-2 rounded-full', unread ? 'bg-primary' : 'bg-border-strong')} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className={cn('text-sm text-text-primary', unread && 'font-semibold')}>{item.title}</Text>
        {item.message ? <Text className="text-sm text-text-secondary">{item.message}</Text> : null}
        <Text className="text-[11px] text-text-disabled">{formatRelative(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const listStyle = useListContentStyle();
  const setUnread = useNotificationStore((s) => s.setUnreadCount);
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const unreadCount = data.filter((n) => !n.isRead).length;
  useEffect(() => setUnread(unreadCount), [unreadCount, setUnread]);

  const load = useCallback(async () => {
    try {
      setData(await NotificationClientService.getNotifications());
    } catch (err: unknown) {
      handleApiError(err, 'NotificationsScreen.load');
    }
  }, []);

  // The drawer keeps this screen mounted: after an organization switch show that inbox, not the old one.
  useEffect(() => {
    setData([]);
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, tenantId]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function markRead(id: string) {
    try {
      await NotificationClientService.markAsRead(id);
      setData((prev) => prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n)));
    } catch (err: unknown) {
      handleApiError(err, 'NotificationsScreen.markRead');
    }
  }

  async function open(item: Notification) {
    if (!item.isRead) await markRead(item.notificationId);
    const url = notificationTarget(item, env.EXPO_PUBLIC_FRONTEND_URL);
    if (url) await WebBrowser.openBrowserAsync(url).catch(() => undefined);
  }

  async function markAllRead() {
    try {
      await NotificationClientService.markAllAsRead();
      setData((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('NOTIFICATIONS.MARKED_ALL'));
    } catch (err: unknown) {
      handleApiError(err, 'NotificationsScreen.markAllRead');
    }
  }

  async function clearAll() {
    try {
      await NotificationClientService.clearAll();
      setData([]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('NOTIFICATIONS.CLEARED'));
    } catch (err: unknown) {
      handleApiError(err, 'NotificationsScreen.clearAll');
    }
  }

  const actions = [
    ...(unreadCount > 0 ? [{ label: t('NOTIFICATIONS.MARK_ALL_READ'), onPress: markAllRead, variant: 'outline' as const }] : []),
    ...(data.length > 0 ? [{ label: t('NOTIFICATIONS.CLEAR_ALL'), onPress: () => setConfirmClear(true), variant: 'ghost' as const }] : []),
  ];

  return (
    <Screen scroll={false}>
      <FlatList
        data={loading ? [] : data}
        keyExtractor={(n) => n.notificationId}
        contentContainerStyle={listStyle}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.primary} colors={[tokens.primary]} />}
        ListHeaderComponent={
          <View className="mb-6 gap-4">
            <ScreenHeader
              title={t('NOTIFICATIONS.TITLE')}
              subtitle={unreadCount > 0 ? t('NOTIFICATIONS.SUBTITLE', { count: unreadCount }) : t('NOTIFICATIONS.SUBTITLE_NONE')}
            />
            {actions.length > 0 ? (
              // Actions under the header: two labels don't fit beside the title at phone width.
              <View className="flex-row flex-wrap gap-2">
                {actions.map((a) => (
                  <Button key={a.label} size="sm" variant={a.variant} onPress={a.onPress}>
                    {a.label}
                  </Button>
                ))}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            className={cn(
              'overflow-hidden border-x border-border bg-surface-raised',
              index === 0 && 'rounded-t-xl border-t',
              index === data.length - 1 ? 'rounded-b-xl border-b' : 'border-b',
            )}
          >
            <NotificationRow item={item} onPress={() => open(item)} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-16" accessibilityState={{ busy: true }}>
              <Spinner size="lg" />
            </View>
          ) : (
            <EmptyState icon={faBellSlash} title={t('NOTIFICATIONS.EMPTY')} description={t('NOTIFICATIONS.EMPTY_DESC')} />
          )
        }
      />
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('NOTIFICATIONS.CLEAR_TITLE')}
        description={t('NOTIFICATIONS.CLEAR_DESC')}
        confirmLabel={t('NOTIFICATIONS.CLEAR_CONFIRM')}
        onConfirm={clearAll}
      />
    </Screen>
  );
}

