import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { Button, Input, Modal, Select } from '@/components/ui';
import { SendInvitationRequestSchema, type MemberRole } from '@/services/tenant/tenant.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { TenantClientService } from '@/services/tenant/tenant.service.client';

type InviteMemberModalProps = {
  tenantId: string;
  open: boolean;
  onClose: () => void;
  onInvited?: () => void;
};

/** next-boilerplate "Üye davet et" modal: email + role, Cancel / Send invite. */
export function InviteMemberModal({ tenantId, open, onClose, onInvited }: InviteMemberModalProps) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('USER');
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  function close() {
    setEmail('');
    setRole('USER');
    setError(undefined);
    onClose();
  }

  async function send() {
    const result = SendInvitationRequestSchema.safeParse({ email: email.trim(), memberRole: role });
    if (!result.success) {
      setError(t('AUTH_UI.EMAIL_INVALID'));
      return;
    }
    setSending(true);
    try {
      await TenantClientService.sendInvitation(tenantId, result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('MEMBERS.INVITE_SENT'));
      onInvited?.();
      close();
    } catch (err: unknown) {
      handleApiError(err, 'InviteMemberModal.send');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={sending ? () => {} : close}
      title={t('MEMBERS.INVITE')}
      description={t('MEMBERS.INVITE_DESC')}
      footer={
        <>
          <Button variant="ghost" onPress={close} disabled={sending} testID="members-invite-cancel">
            {t('COMMON.CANCEL')}
          </Button>
          <Button
            loading={sending}
            onPress={send}
            iconLeft={<FontAwesomeIcon icon={faUserPlus} size={12} color={tokens['primary-fg']} />}
            testID="members-invite-send"
          >
            {t('MEMBERS.SEND_INVITE')}
          </Button>
        </>
      }
    >
      <View className="gap-4">
        <Input
          label={t('MEMBERS.INVITE_EMAIL')}
          type="email"
          required
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(undefined);
          }}
          error={error}
          autoComplete="email"
          testID="members-invite-email"
        />
        <Select
          id="members-invite-role"
          label={t('MEMBERS.INVITE_ROLE')}
          value={role}
          onChange={(v) => setRole(v as MemberRole)}
          options={(['USER', 'ADMIN'] as const).map((r) => ({ value: r, label: t(`ROLES.${r}`) }))}
        />
      </View>
    </Modal>
  );
}
