import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Button, Modal, Select } from '@/components/ui';
import type { MemberRole, MemberStatus, TenantMember } from '@/dto/tenant.dto';
import { handleApiError } from '@/libs/errorUtils';
import { TenantClientService } from '@/services/tenant.service.client';

type EditMemberModalProps = {
  member: TenantMember | null;
  onClose: () => void;
  onSaved: (member: TenantMember) => void;
};

/** next-boilerplate "Düzenle": role + status. */
export function EditMemberModal({ member, onClose, onSaved }: EditMemberModalProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState<MemberRole>('USER');
  const [status, setStatus] = useState<MemberStatus>('ACTIVE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.memberRole);
      setStatus(member.memberStatus);
    }
  }, [member]);

  async function save() {
    if (!member) return;
    setSaving(true);
    try {
      const updated = await TenantClientService.updateMember(member.tenantId, member.tenantMemberId, { memberRole: role, memberStatus: status });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('MEMBERS.UPDATED'));
      onSaved(updated);
      onClose();
    } catch (err: unknown) {
      handleApiError(err, 'EditMemberModal.save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={member !== null}
      onClose={saving ? () => {} : onClose}
      title={t('COMMON.EDIT')}
      description={member?.user?.email ?? undefined}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={saving}>
            {t('COMMON.CANCEL')}
          </Button>
          <Button loading={saving} onPress={save} testID="members-edit-save">
            {saving ? t('COMMON.SAVING') : t('COMMON.SAVE')}
          </Button>
        </>
      }
    >
      <View className="gap-4">
        <Select
          id="members-edit-role"
          label={t('MEMBERS.INVITE_ROLE')}
          value={role}
          onChange={(v) => setRole(v as MemberRole)}
          options={(['USER', 'ADMIN'] as const).map((r) => ({ value: r, label: t(`ROLES.${r}`) }))}
        />
        <Select
          id="members-edit-status"
          label={t('ORGANIZATION.STATUS')}
          value={status}
          onChange={(v) => setStatus(v as MemberStatus)}
          options={(['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((s) => ({ value: s, label: t(`MEMBERS.STATUS_${s}`) }))}
        />
      </View>
    </Modal>
  );
}
