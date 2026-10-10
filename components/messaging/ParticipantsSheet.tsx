import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Avatar, Badge, Button, Input, Modal, Spinner, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { loadMemberNames, memberLabel } from '@/libs/memberNames';
import type { Conversation } from '@/services/platform/messaging.dto';
import { MessagingClientService } from '@/services/platform/messaging.service.client';
import type { TenantMember } from '@/services/tenant/tenant.dto';
import { useAuthStore } from '@/stores/authStore';
import { useMessagingStore } from '@/stores/messagingStore';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { canManageParticipants, sortParticipants, withParticipant } from '@/utils/messaging';

type Props = { conversation: Conversation | undefined; open: boolean; onClose: () => void };

const ROLE_VARIANT = { owner: 'primary', admin: 'info', member: 'neutral' } as const;

/** Who is in a group, and (owner/admin only) a picker to add more colleagues. Roles are the conversation's, not the organization's. */
export function ParticipantsSheet({ conversation, open, onClose }: Props) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user?.userId);
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const names = useMessagingStore((s) => s.names);
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<TenantMember[] | null>(null);
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = conversation ? canManageParticipants(conversation, me) : false;
  const conversationId = conversation?.conversationId;

  // Back to the roster whenever the sheet closes, the conversation changes or the organization switches.
  useEffect(() => {
    setAdding(false);
    setFilter('');
    setMembers(null);
    setBusyId(null);
  }, [open, conversationId, tenantId]);

  useEffect(() => {
    if (!open || !adding) return;
    let stale = false;
    loadMemberNames().then((list) => {
      if (!stale) setMembers(list);
    });
    return () => {
      stale = true;
    };
  }, [open, adding, tenantId]);

  const nameOf = (id: string) => names[id];
  const roster = useMemo(() => (conversation ? sortParticipants(conversation.participants, (id) => names[id]) : []), [conversation, names]);
  const candidates = useMemo(() => {
    const inside = new Set((conversation?.participants ?? []).map((p) => p.userId));
    const q = filter.trim().toLowerCase();
    return (members ?? []).filter((m) => !inside.has(m.userId) && (!q || memberLabel(m).toLowerCase().includes(q)));
  }, [members, conversation, filter]);

  async function add(member: TenantMember) {
    if (!conversation) return;
    const tenant = getActiveTenantId();
    setBusyId(member.userId);
    try {
      const participant = await MessagingClientService.addParticipant(conversation.conversationId, { userId: member.userId, role: 'member' });
      if (getActiveTenantId() !== tenant) return; // switched organization meanwhile: the old one's answer
      const store = useMessagingStore.getState();
      const current = store.conversations.find((c) => c.conversationId === conversation.conversationId) ?? conversation;
      store.upsertConversation(withParticipant(current, participant));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined); // feedback only: never fail an added person
      toast.success(t('MESSAGES.PARTICIPANT_ADDED', { name: memberLabel(member) || t('MESSAGES.UNKNOWN') }));
    } catch (err: unknown) {
      handleApiError(err, 'ParticipantsSheet.add');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal
      open={open && Boolean(conversation)}
      onClose={onClose}
      title={adding ? t('MESSAGES.ADD_PEOPLE') : t('MESSAGES.PARTICIPANTS_TITLE', { count: roster.length })}
      description={adding ? t('MESSAGES.ADD_PEOPLE_DESC') : conversation?.title ?? undefined}
      scrollable
    >
      {adding ? (
        <View className="gap-3">
          <Input value={filter} onChangeText={setFilter} placeholder={t('MESSAGES.FIND_PERSON')} autoCapitalize="none" autoCorrect={false} testID="messages-add-filter" />
          {members === null ? <Spinner /> : null}
          {members !== null && candidates.length === 0 ? <Text className="text-sm text-text-secondary">{t('MESSAGES.NO_ONE_TO_ADD')}</Text> : null}
          {candidates.map((m) => (
            <Pressable
              key={m.userId}
              onPress={() => void add(m)}
              disabled={busyId !== null}
              accessibilityRole="button"
              accessibilityLabel={t('MESSAGES.ADD_PERSON_A11Y', { name: memberLabel(m) })}
              testID={`messages-add-${m.userId}`}
              className="flex-row items-center gap-3 border-b border-border py-2 active:bg-surface-overlay"
            >
              <Avatar name={memberLabel(m) || '?'} src={m.user?.userProfile?.profilePicture ?? undefined} size="sm" />
              <Text className="min-w-0 flex-1 text-sm text-text-primary" numberOfLines={1}>
                {memberLabel(m)}
              </Text>
              {busyId === m.userId ? <Spinner /> : null}
            </Pressable>
          ))}
          <Button variant="outline" onPress={() => setAdding(false)} disabled={busyId !== null} testID="messages-add-done">
            {t('MESSAGES.DONE')}
          </Button>
        </View>
      ) : (
        <View className="gap-3">
          {roster.map((p) => (
            <View key={p.userId} className="flex-row items-center gap-3 border-b border-border py-2" testID={`messages-participant-${p.userId}`}>
              <Avatar name={nameOf(p.userId) || '?'} size="sm" />
              <Text className="min-w-0 flex-1 text-sm text-text-primary" numberOfLines={1}>
                {p.userId === me ? t('MESSAGES.YOU') : (nameOf(p.userId) ?? t('MESSAGES.UNKNOWN'))}
              </Text>
              <Badge variant={ROLE_VARIANT[p.role as keyof typeof ROLE_VARIANT] ?? 'neutral'} size="sm">
                {t(`MESSAGES.ROLE_${p.role.toUpperCase()}`, { defaultValue: p.role })}
              </Badge>
            </View>
          ))}
          {canManage ? (
            <Button onPress={() => setAdding(true)} testID="messages-add-people">
              {t('MESSAGES.ADD_PEOPLE')}
            </Button>
          ) : null}
        </View>
      )}
    </Modal>
  );
}
