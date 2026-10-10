import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Screen, useListContentStyle } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ReportMessageModal } from '@/components/messaging/ReportMessageModal';
import { Button, Input, Spinner, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { loadMemberNames } from '@/libs/memberNames';
import { joinRoom, sendTyping, setOpenConversation } from '@/libs/realtime';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import type { Conversation, Message } from '@/services/platform/messaging.dto';
import { MessagingClientService } from '@/services/platform/messaging.service.client';
import { useAuthStore } from '@/stores/authStore';
import { useMessagingStore } from '@/stores/messagingStore';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { cn } from '@/utils/cn';
import { formatRelative } from '@/utils/format';
import { conversationTitle } from '@/utils/messaging';

const TYPING_REFRESH_MS = 3_000;

type Item =
  | { kind: 'message'; message: Message }
  | { kind: 'pending'; nonce: string; body: string; status: 'sending' | 'failed'; createdAt: string };

function newNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function Bubble({ mine, author, body, meta, onLongPress, tone }: { mine: boolean; author?: string; body: string; meta: string; onLongPress?: () => void; tone?: 'failed' | 'sending' }) {
  return (
    <View className={cn('my-1 max-w-[85%]', mine ? 'self-end' : 'self-start')}>
      {author ? <Text className="mb-0.5 px-1 text-[11px] text-text-secondary">{author}</Text> : null}
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="text"
        className={cn('rounded-2xl px-3 py-2', mine ? 'bg-primary' : 'bg-surface-raised border border-border', tone === 'sending' && 'opacity-60', tone === 'failed' && 'border border-error')}
      >
        <Text className={cn('text-sm', mine ? 'text-text-inverse' : 'text-text-primary')}>{body}</Text>
      </Pressable>
      <Text className={cn('mt-0.5 px-1 text-[10px]', tone === 'failed' ? 'text-error' : 'text-text-disabled', mine && 'text-right')}>{meta}</Text>
    </View>
  );
}

export default function ThreadScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const listStyle = useListContentStyle();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const me = useAuthStore((s) => s.user?.userId);
  const conversation = useMessagingStore((s) => s.conversations.find((c) => c.conversationId === conversationId));
  const messages = useMessagingStore((s) => s.messages[conversationId] ?? EMPTY);
  const pending = useMessagingStore((s) => s.pending);
  const typingMap = useMessagingStore((s) => s.typing[conversationId]);
  const names = useMessagingStore((s) => s.names);
  const olderCursor = useMessagingStore((s) => s.olderCursor[conversationId]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [reporting, setReporting] = useState<Message | null>(null);
  const [, tick] = useState(0);
  const lastTypingSent = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGroup = (conversation?.type ?? 'direct') === 'group';
  const title = conversation ? conversationTitle(conversation, me, (id) => names[id], t('MESSAGES.UNKNOWN')) : t('MESSAGES.TITLE');

  // The conversation may not be in the list yet (opened right after creating it, or from a stale link).
  const load = useCallback(async () => {
    try {
      const tenant = getActiveTenantId();
      const store = useMessagingStore.getState();
      if (!store.conversations.some((c) => c.conversationId === conversationId)) {
        const c: Conversation = await MessagingClientService.getConversation(conversationId);
        if (getActiveTenantId() !== tenant) return; // switched organization meanwhile: this answer is the old one's
        store.upsertConversation(c);
      }
      const page = await MessagingClientService.listMessages(conversationId);
      if (getActiveTenantId() !== tenant) return;
      useMessagingStore.getState().mergeThread(conversationId, page.messages, page.nextCursor);
      void loadMemberNames();
    } catch (err: unknown) {
      handleApiError(err, 'ThreadScreen.load');
    }
  }, [conversationId]);

  useEffect(() => {
    setOpenConversation(conversationId);
    joinRoom(conversationId);
    setLoading(true);
    load().finally(() => setLoading(false));
    return () => {
      setOpenConversation(null);
      if (stopTimer.current) clearTimeout(stopTimer.current);
      sendTyping(conversationId, false);
    };
  }, [conversationId, tenantId, load]);

  // Newest message from someone else on screen → tell the server (clears the badge on every device).
  const newestId = messages[0]?.messageId;
  const newestFromOther = messages[0] !== undefined && messages[0].senderUserId !== me;
  useEffect(() => {
    if (!newestId || !newestFromOther) return;
    useMessagingStore.getState().setUnread(conversationId, 0);
    MessagingClientService.markRead(conversationId, newestId).catch(() => undefined); // best effort; the next open retries
  }, [newestId, newestFromOther, conversationId]);

  // Typing indicators expire on their own: re-render while any is up.
  const typingUsers = useMemo(() => Object.entries(typingMap ?? {}).filter(([, until]) => until > Date.now()).map(([id]) => id), [typingMap, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!typingMap || Object.keys(typingMap).length === 0) return;
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, [typingMap]);

  function onChangeText(value: string) {
    setText(value);
    const now = Date.now();
    if (value && now - lastTypingSent.current > TYPING_REFRESH_MS) {
      lastTypingSent.current = now;
      sendTyping(conversationId, true);
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      lastTypingSent.current = 0;
      sendTyping(conversationId, false);
    }, TYPING_REFRESH_MS);
  }

  async function deliver(nonce: string, body: string) {
    const store = useMessagingStore.getState();
    try {
      const message = await MessagingClientService.sendMessage(conversationId, { body, clientNonce: nonce });
      store.settlePending(nonce, message);
    } catch (err: unknown) {
      store.failPending(nonce);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'ThreadScreen.send');
    }
  }

  function send() {
    const body = text.trim();
    if (!body) return;
    const nonce = newNonce();
    useMessagingStore.getState().addPending({ nonce, conversationId, body, createdAt: new Date().toISOString(), status: 'sending' });
    setText('');
    sendTyping(conversationId, false);
    void deliver(nonce, body);
  }

  function retry(nonce: string, body: string) {
    useMessagingStore.getState().retryPending(nonce);
    void deliver(nonce, body);
  }

  async function loadOlder() {
    if (loadingOlder || !olderCursor) return;
    setLoadingOlder(true);
    try {
      const page = await MessagingClientService.listMessages(conversationId, { cursor: olderCursor });
      useMessagingStore.getState().mergeThread(conversationId, page.messages, page.nextCursor);
    } catch (err: unknown) {
      handleApiError(err, 'ThreadScreen.older');
    } finally {
      setLoadingOlder(false);
    }
  }

  // Inverted list: index 0 is the newest. Unconfirmed sends sit at the very bottom.
  const items: Item[] = useMemo(
    () => [
      ...pending
        .filter((p) => p.conversationId === conversationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((p) => ({ kind: 'pending' as const, nonce: p.nonce, body: p.body, status: p.status, createdAt: p.createdAt })),
      ...messages.map((message) => ({ kind: 'message' as const, message })),
    ],
    [pending, messages, conversationId],
  );

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <View className="px-4 pt-6">
          <ScreenHeader back={{ label: t('MESSAGES.TITLE'), href: '/messages' }} title={title} />
        </View>
        {loading && items.length === 0 ? (
          <Spinner />
        ) : (
          <FlatList
            inverted
            data={items}
            keyExtractor={(i) => (i.kind === 'pending' ? `p-${i.nonce}` : i.message.messageId)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => void loadOlder()}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingOlder ? <Spinner /> : null}
            ListEmptyComponent={<Text className="py-8 text-center text-sm text-text-secondary">{t('MESSAGES.THREAD_EMPTY')}</Text>}
            renderItem={({ item }) => {
              if (item.kind === 'pending') {
                return (
                  <View>
                    <Bubble mine body={item.body} tone={item.status} meta={item.status === 'sending' ? t('MESSAGES.SENDING') : t('MESSAGES.FAILED')} />
                    {item.status === 'failed' ? (
                      <Pressable onPress={() => retry(item.nonce, item.body)} accessibilityRole="button" className="mb-1 flex-row items-center gap-1.5 self-end px-1" testID={`messages-retry-${item.nonce}`}>
                        <FontAwesomeIcon icon={faTriangleExclamation} size={11} color={tokens.error} />
                        <Text className="text-xs font-medium text-error">{t('MESSAGES.RETRY')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              }
              const m = item.message;
              const mine = m.senderUserId === me;
              const held = mine && ['PENDING', 'REJECTED', 'HIDDEN'].includes(m.moderationStatus);
              return (
                <Bubble
                  mine={mine}
                  author={!mine && isGroup ? (names[m.senderUserId] ?? t('MESSAGES.UNKNOWN')) : undefined}
                  body={m.body}
                  meta={held ? t(`MESSAGES.MODERATION_${m.moderationStatus}`) : formatRelative(m.createdAt)}
                  tone={held ? 'failed' : undefined}
                  onLongPress={!mine ? () => setReporting(m) : undefined}
                />
              );
            }}
          />
        )}
        {typingUsers.length > 0 ? <Text className="px-4 pb-1 text-xs text-text-secondary">{t('MESSAGES.TYPING')}</Text> : null}
        <View className="flex-row items-end gap-2 border-t border-border bg-surface-raised px-3 py-2">
          <View className="flex-1">
            <Input value={text} onChangeText={onChangeText} placeholder={t('MESSAGES.COMPOSER')} multiline maxLength={8000} testID="messages-composer" />
          </View>
          <Button onPress={send} disabled={!text.trim()} accessibilityLabel={t('MESSAGES.SEND')} testID="messages-send">
            <FontAwesomeIcon icon={faPaperPlane} size={14} color={tokens['text-inverse']} />
          </Button>
        </View>
      </KeyboardAvoidingView>
      <ReportMessageModal
        message={reporting}
        onClose={() => setReporting(null)}
        onReported={() => {
          setReporting(null);
          toast.success(t('MESSAGES.REPORTED'));
        }}
      />
    </Screen>
  );
}

const EMPTY: Message[] = [];
