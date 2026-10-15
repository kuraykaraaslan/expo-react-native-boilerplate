import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Button, Modal, Select } from '@/components/ui';
import type { MemberRole, MemberStatus, TenantMember } from '@/modules/tenant/tenant.dto';
import { handleApiError } from '@/libs/errorUtils';
import { TenantClientService } from '@/modules/tenant/tenant.service.client';

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
      const result = await TenantClientService.updateMember(member.tenantId, member.tenantMemberId, { memberRole: role, memberStatus: status });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.member) {
        toast.success(t('tenant_member.list.updated'));
        onSaved(result.member);
      } else {
        // Dual control: the change is queued for approval, the member is unchanged for now.
        toast.info(t('tenant_member.list.pendingApproval'));
      }
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
      title={t('common.actions.edit')}
      description={member?.user?.email ?? undefined}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={saving}>
            {t('common.actions.cancel')}
          </Button>
          <Button loading={saving} onPress={save} testID="members-edit-save">
            {saving ? t('common.actions.saving') : t('common.actions.save')}
          </Button>
        </>
      }
    >
      <View className="gap-4">
        <Select
          id="members-edit-role"
          label={t('tenant_member.list.colRole')}
          value={role}
          onChange={(v) => setRole(v as MemberRole)}
          options={(['USER', 'ADMIN'] as const).map((r) => ({ value: r, label: t(`tenant_member.roles.${r.toLowerCase()}`) }))}
        />
        <Select
          id="members-edit-status"
          label={t('tenant.organization.status')}
          value={status}
          onChange={(v) => setStatus(v as MemberStatus)}
          options={(['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((s) => ({ value: s, label: t(`tenant_member.statusBadge.${s.toLowerCase()}`) }))}
        />
      </View>
    </Modal>
  );
}
