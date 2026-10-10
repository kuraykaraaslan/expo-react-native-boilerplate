import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Avatar, Button, ButtonGroup, Checkbox, Input, Modal, Spinner, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { loadMemberNames, memberLabel } from '@/libs/memberNames';
import type { Conversation } from '@/services/platform/messaging.dto';
import { MessagingClientService } from '@/services/platform/messaging.service.client';
import type { TenantMember } from '@/services/tenant/tenant.dto';
import { useAuthStore } from '@/stores/authStore';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';

type Props = { open: boolean; onClose: () => void; onStarted: (conversation: Conversation) => void };
type Mode = 'direct' | 'group';

const MAX_GROUP_PEOPLE = 256; // server cap on participantUserIds

/** Start a direct conversation (the server returns the existing one if there is one) or create a group with a title and several people. */
export function NewConversationModal({ open, onClose, onStarted }: Props) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user?.userId);
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const [mode, setMode] = useState<Mode>('direct');
  const [members, setMembers] = useState<TenantMember[] | null>(null);
  const [filter, setFilter] = useState('');
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let stale = false;
    setMode('direct');
    setFilter('');
    setTitle('');
    setSelected([]);
    setMembers(null);
    loadMemberNames().then((list) => {
      if (!stale) setMembers(list);
    });
    return () => {
      stale = true; // closed, or the organization changed: this directory is the old one's
    };
  }, [open, tenantId]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (members ?? []).filter((m) => m.userId !== me && (!q || memberLabel(m).toLowerCase().includes(q)));
  }, [members, filter, me]);

  async function create(payload: Parameters<typeof MessagingClientService.createConversation>[0], key: string) {
    const tenant = getActiveTenantId();
    setStarting(key);
    try {
      const conversation = await MessagingClientService.createConversation(payload);
      if (getActiveTenantId() !== tenant) return; // switched organization meanwhile: do not open the old one's conversation
      if (payload.type === 'group') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onStarted(conversation);
    } catch (err: unknown) {
      handleApiError(err, 'NewConversationModal.create');
    } finally {
      setStarting(null);
    }
  }

  const toggle = (userId: string, on: boolean) => setSelected((cur) => (on ? (cur.includes(userId) ? cur : [...cur, userId]) : cur.filter((id) => id !== userId)));
  const canCreate = title.trim().length > 0 && selected.length > 0 && selected.length <= MAX_GROUP_PEOPLE;
  const busy = starting !== null;

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={mode === 'group' ? t('MESSAGES.NEW_GROUP') : t('MESSAGES.NEW')}
      description={mode === 'group' ? t('MESSAGES.NEW_GROUP_DESC') : t('MESSAGES.NEW_DESC')}
      scrollable
    >
      <View className="gap-3">
        <ButtonGroup
          size="sm"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          items={[
            { value: 'direct', label: t('MESSAGES.MODE_DIRECT'), disabled: busy },
            { value: 'group', label: t('MESSAGES.MODE_GROUP'), disabled: busy },
          ]}
        />
        {mode === 'group' ? <Input value={title} onChangeText={setTitle} placeholder={t('MESSAGES.GROUP_TITLE')} maxLength={200} testID="messages-group-title" /> : null}
        <Input value={filter} onChangeText={setFilter} placeholder={t('MESSAGES.FIND_PERSON')} autoCapitalize="none" autoCorrect={false} testID="messages-find-person" />
        {members === null ? <Spinner /> : null}
        {members !== null && shown.length === 0 ? <Text className="text-sm text-text-secondary">{t('MESSAGES.NO_PEOPLE')}</Text> : null}
        {shown.map((m) =>
          mode === 'group' ? (
            <View key={m.userId} className="flex-row items-center gap-3 border-b border-border py-2" testID={`messages-person-${m.userId}`}>
              <Checkbox checked={selected.includes(m.userId)} onChange={(on) => toggle(m.userId, on)} label={memberLabel(m)} disabled={busy} className="flex-1" />
            </View>
          ) : (
            <Pressable
              key={m.userId}
              onPress={() => void create({ type: 'direct', participantUserIds: [m.userId] }, m.userId)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={memberLabel(m)}
              testID={`messages-person-${m.userId}`}
              className="flex-row items-center gap-3 border-b border-border py-2 active:bg-surface-overlay"
            >
              <Avatar name={memberLabel(m) || '?'} src={m.user?.userProfile?.profilePicture ?? undefined} size="sm" />
              <Text className="min-w-0 flex-1 text-sm text-text-primary" numberOfLines={1}>
                {memberLabel(m)}
              </Text>
              {starting === m.userId ? <Spinner /> : null}
            </Pressable>
          ),
        )}
        {mode === 'group' ? (
          <Button
            onPress={() => void create({ type: 'group', title: title.trim(), participantUserIds: selected }, 'group')}
            disabled={!canCreate || busy}
            loading={starting === 'group'}
            testID="messages-group-create"
          >
            {t('MESSAGES.CREATE_GROUP', { count: selected.length })}
          </Button>
        ) : null}
      </View>
    </Modal>
  );
}
