import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Input, Modal, Spinner, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { loadMemberNames, memberLabel } from '@/libs/memberNames';
import type { Conversation } from '@/services/platform/messaging.dto';
import { MessagingClientService } from '@/services/platform/messaging.service.client';
import type { TenantMember } from '@/services/tenant/tenant.dto';
import { useAuthStore } from '@/stores/authStore';

type Props = { open: boolean; onClose: () => void; onStarted: (conversation: Conversation) => void };

/** Pick a colleague to start a direct conversation with (the server returns the existing one if there is one). */
export function NewConversationModal({ open, onClose, onStarted }: Props) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user?.userId);
  const [members, setMembers] = useState<TenantMember[] | null>(null);
  const [filter, setFilter] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFilter('');
    setMembers(null);
    loadMemberNames().then(setMembers);
  }, [open]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (members ?? []).filter((m) => m.userId !== me && (!q || memberLabel(m).toLowerCase().includes(q)));
  }, [members, filter, me]);

  async function start(member: TenantMember) {
    setStarting(member.userId);
    try {
      onStarted(await MessagingClientService.createConversation({ type: 'direct', participantUserIds: [member.userId] }));
    } catch (err: unknown) {
      handleApiError(err, 'NewConversationModal.start');
    } finally {
      setStarting(null);
    }
  }

  return (
    <Modal open={open} onClose={starting ? () => {} : onClose} title={t('MESSAGES.NEW')} description={t('MESSAGES.NEW_DESC')} scrollable>
      <View className="gap-3">
        <Input value={filter} onChangeText={setFilter} placeholder={t('MESSAGES.FIND_PERSON')} autoCapitalize="none" autoCorrect={false} testID="messages-find-person" />
        {members === null ? <Spinner /> : null}
        {members !== null && shown.length === 0 ? <Text className="text-sm text-text-secondary">{t('MESSAGES.NO_PEOPLE')}</Text> : null}
        {shown.map((m) => (
          <Pressable
            key={m.userId}
            onPress={() => void start(m)}
            disabled={starting !== null}
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
        ))}
      </View>
    </Modal>
  );
}
