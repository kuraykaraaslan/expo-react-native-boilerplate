import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { faClipboardList, faEnvelopeOpenText, faSliders, faUsers } from '@fortawesome/free-solid-svg-icons';
import { RoleBadge } from '@/components/common/Badges';
import { LinkTile } from '@/components/common/LinkTile';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SectionLabel } from '@/components/common/SectionLabel';
import { NoOrganization } from '@/components/tenant/NoOrganization';
import { Badge, Button, Card, Input, Text, Textarea } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { TenantClientService } from '@/modules/tenant/tenant.service.client';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { useTenantStore } from '@/stores/tenantStore';
import { formatDate } from '@/utils/format';

function Row({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <View className={`min-h-[44px] flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-border'}`}>
      <Text className="w-28 text-sm text-text-secondary">{label}</Text>
      <View className="min-w-0 flex-1 flex-row justify-end">{children}</View>
    </View>
  );
}

const STATUS_VARIANT = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PENDING: 'warning',
  SUSPENDED: 'error',
  DELETED: 'error',
  ARCHIVED: 'neutral',
} as const;

export default function OrganizationScreen() {
  const { t } = useTranslation();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const tenant = membership?.tenant;
  const selectMembership = useTenantStore((s) => s.selectMembership);
  // Only OWNER / ADMIN may edit; the role is the one the server gave for THIS tenant.
  const canEdit = membership?.memberRole === 'OWNER' || membership?.memberRole === 'ADMIN';
  const [name, setName] = useState(tenant?.name ?? '');
  const [description, setDescription] = useState(tenant?.description ?? '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Keep the form in step with the organization actually active (switching changes it).
  useEffect(() => {
    setName(tenant?.name ?? '');
    setDescription(tenant?.description ?? '');
    setNameError(undefined);
  }, [tenant?.tenantId, tenant?.name, tenant?.description]);

  async function handleSave() {
    if (!membership) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError(t('auth.ui.orgNameInvalid'));
      return;
    }
    setNameError(undefined);
    setSaving(true);
    try {
      const saved = await TenantClientService.updateTenantProfile({ name: trimmed, description: description.trim() || null });
      selectMembership({ ...membership, tenant: { ...membership.tenant, name: saved.name, description: saved.description } });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('tenant.organization.saved'));
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'OrganizationScreen.save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader back={{ label: t('account.settingsHub.title'), href: '/settings' }} title={t('tenant.organization.title')} subtitle={t('tenant.organization.subtitle')} />
      {membership ? (
        <>
          <Card title={t('tenant.organization.card')} subtitle={t('tenant.organization.cardDesc')}>
            <Row label={t('tenant.organization.name')}>
              <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
                {tenant?.name ?? membership.tenantId}
              </Text>
            </Row>
            {tenant?.description ? (
              <Row label={t('tenant.organization.description')}>
                <Text className="text-right text-sm text-text-primary">{tenant.description}</Text>
              </Row>
            ) : null}
            <Row label={t('tenant.organization.status')}>
              <Badge variant={STATUS_VARIANT[tenant?.tenantStatus ?? 'ACTIVE']} size="sm" dot>
                {t(`tenant.status.${(tenant?.tenantStatus ?? 'ACTIVE').toLowerCase()}`)}
              </Badge>
            </Row>
            <Row label={t('tenant.organization.yourRole')}>
              <RoleBadge role={membership.memberRole} />
            </Row>
            <Row label={t('tenant.organization.created')} last>
              <Text className="text-sm text-text-primary">{formatDate(tenant?.createdAt) || '—'}</Text>
            </Row>
          </Card>

          {canEdit ? (
            <Card title={t('tenant.organization.editCard')} subtitle={t('tenant.organization.editCardDesc')}>
              <View className="gap-3">
                <Input
                  label={t('tenant.organization.name')}
                  required
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    setNameError(undefined);
                  }}
                  error={nameError}
                  maxLength={100}
                  testID="organization-name"
                />
                <Textarea label={t('tenant.organization.description')} rows={3} value={description} onChangeText={setDescription} testID="organization-description" />
                <Button loading={saving} onPress={handleSave} testID="organization-save">
                  {t('tenant.organization.save')}
                </Button>
              </View>
            </Card>
          ) : (
            <Text className="px-1 text-xs text-text-secondary">{t('tenant.organization.readOnly')}</Text>
          )}

          <View className="gap-3">
            <SectionLabel>{t('tenant.organization.manage')}</SectionLabel>
            <LinkTile icon={faSliders} title={t('tenant_setting.general.tile')} description={t('tenant_setting.general.tileDesc')} href="/settings/tenant/settings" testID="organization-settings" />
            <LinkTile icon={faClipboardList} title={t('audit_log.list.title')} description={t('audit_log.list.tileDesc')} href="/settings/tenant/audit-log" testID="organization-audit-log" />
            <LinkTile icon={faUsers} title={t('account.settingsHub.members')} description={t('account.settingsHub.membersDesc')} href="/settings/tenant/members" testID="organization-members" />
            <LinkTile icon={faEnvelopeOpenText} title={t('account.settingsHub.invitations')} description={t('account.settingsHub.invitationsDesc')} href="/settings/tenant/invitations" testID="organization-invitations" />
          </View>
        </>
      ) : (
        <NoOrganization />
      )}
    </Screen>
  );
}
