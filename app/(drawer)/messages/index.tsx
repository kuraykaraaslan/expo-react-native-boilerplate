import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import { Screen, useListContentStyle } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { NewConversationModal } from '@/components/messaging/NewConversationModal';
import { Avatar, Badge, EmptyState, Spinner, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { loadMemberNames } from '@/libs/memberNames';
import { backfill } from '@/libs/realtime';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { MessagingClientService } from '@/services/platform/messaging.service.client';
import { useAuthStore } from '@/stores/authStore';
import { useMessagingStore } from '@/stores/messagingStore';
import { useTenantStore } from '@/stores/tenantStore';
import { formatRelative } from '@/utils/format';
import { conversationTitle } from '@/utils/messaging';
import type { Conversation } from '@/services/platform/messaging.dto';

function ConversationRow({ item }: { item: Conversation }) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user?.userId);
  const names = useMessagingStore((s) => s.names);
  const title = conversationTitle(item, me, (id) => names[id], t('MESSAGES.UNKNOWN'));
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/messages/[conversationId]', params: { conversationId: item.conversationId } })}
      accessibilityRole="button"
      accessibilityLabel={item.unreadCount > 0 ? t('MESSAGES.UNREAD_A11Y', { title, count: item.unreadCount }) : title}
      testID={`messages-row-${item.conversationId}`}
      className="flex-row items-center gap-3 border-b border-border px-1 py-3 active:bg-surface-overlay"
    >
      <Avatar name={title} size="md" />
      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text className={`min-w-0 flex-1 text-sm text-text-primary ${item.unreadCount > 0 ? 'font-semibold' : 'font-medium'}`} numberOfLines={1}>
            {title}
          </Text>
          {item.lastMessageAt ? <Text className="text-[11px] text-text-disabled">{formatRelative(item.lastMessageAt)}</Text> : null}
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="min-w-0 flex-1 text-xs text-text-secondary" numberOfLines={1}>
            {item.lastMessagePreview || t('MESSAGES.NO_MESSAGES')}
          </Text>
          {item.unreadCount > 0 ? (
            <Badge variant="primary" size="sm">
              {item.unreadCount > 99 ? '99+' : String(item.unreadCount)}
            </Badge>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const listStyle = useListContentStyle();
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const conversations = useMessagingStore((s) => s.conversations);
  const loaded = useMessagingStore((s) => s.conversationsLoaded);
  const connection = useMessagingStore((s) => s.connection);
  const [refreshing, setRefreshing] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      await backfill();
      await loadMemberNames();
    } catch (err: unknown) {
      handleApiError(err, 'MessagesScreen.load');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, tenantId]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function started(conversation: Conversation) {
    setNewOpen(false);
    useMessagingStore.getState().upsertConversation(conversation);
    router.push({ pathname: '/messages/[conversationId]', params: { conversationId: conversation.conversationId } });
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={loaded ? conversations : []}
        keyExtractor={(c) => c.conversationId}
        contentContainerStyle={listStyle}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.primary} colors={[tokens.primary]} />}
        ListHeaderComponent={
          <View className="mb-4 gap-2">
            <ScreenHeader title={t('MESSAGES.TITLE')} subtitle={t('MESSAGES.SUBTITLE')} actions={[{ label: t('MESSAGES.NEW'), onPress: () => setNewOpen(true) }]} />
            {connection === 'reconnecting' ? <Text className="px-1 text-xs text-warning">{t('MESSAGES.RECONNECTING')}</Text> : null}
          </View>
        }
        renderItem={({ item }) => <ConversationRow item={item} />}
        ListEmptyComponent={
          loaded ? (
            <EmptyState icon={faComments} title={t('MESSAGES.EMPTY')} description={t('MESSAGES.EMPTY_DESC')} actionLabel={t('MESSAGES.NEW')} onAction={() => setNewOpen(true)} className="py-8" />
          ) : (
            <Spinner />
          )
        }
      />
      <NewConversationModal open={newOpen} onClose={() => setNewOpen(false)} onStarted={started} />
    </Screen>
  );
}
