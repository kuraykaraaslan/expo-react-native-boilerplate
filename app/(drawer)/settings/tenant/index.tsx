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
import { TenantClientService } from '@/services/tenant/tenant.service.client';
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
      setNameError(t('AUTH_UI.ORG_NAME_INVALID'));
      return;
    }
    setNameError(undefined);
    setSaving(true);
    try {
      const saved = await TenantClientService.updateTenantProfile({ name: trimmed, description: description.trim() || null });
      selectMembership({ ...membership, tenant: { ...membership.tenant, name: saved.name, description: saved.description } });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('ORGANIZATION.SAVED'));
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'OrganizationScreen.save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }} title={t('ORGANIZATION.TITLE')} subtitle={t('ORGANIZATION.SUBTITLE')} />
      {membership ? (
        <>
          <Card title={t('ORGANIZATION.CARD')} subtitle={t('ORGANIZATION.CARD_DESC')}>
            <Row label={t('ORGANIZATION.NAME')}>
              <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
                {tenant?.name ?? membership.tenantId}
              </Text>
            </Row>
            {tenant?.description ? (
              <Row label={t('ORGANIZATION.DESCRIPTION')}>
                <Text className="text-right text-sm text-text-primary">{tenant.description}</Text>
              </Row>
            ) : null}
            <Row label={t('ORGANIZATION.STATUS')}>
              <Badge variant={STATUS_VARIANT[tenant?.tenantStatus ?? 'ACTIVE']} size="sm" dot>
                {t(`ORGANIZATION.STATUS_${tenant?.tenantStatus ?? 'ACTIVE'}`)}
              </Badge>
            </Row>
            <Row label={t('ORGANIZATION.YOUR_ROLE')}>
              <RoleBadge role={membership.memberRole} />
            </Row>
            <Row label={t('ORGANIZATION.CREATED')} last>
              <Text className="text-sm text-text-primary">{formatDate(tenant?.createdAt) || '—'}</Text>
            </Row>
          </Card>

          {canEdit ? (
            <Card title={t('ORGANIZATION.EDIT_CARD')} subtitle={t('ORGANIZATION.EDIT_CARD_DESC')}>
              <View className="gap-3">
                <Input
                  label={t('ORGANIZATION.NAME')}
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
                <Textarea label={t('ORGANIZATION.DESCRIPTION')} rows={3} value={description} onChangeText={setDescription} testID="organization-description" />
                <Button loading={saving} onPress={handleSave} testID="organization-save">
                  {t('ORGANIZATION.SAVE')}
                </Button>
              </View>
            </Card>
          ) : (
            <Text className="px-1 text-xs text-text-secondary">{t('ORGANIZATION.READ_ONLY')}</Text>
          )}

          <View className="gap-3">
            <SectionLabel>{t('ORGANIZATION.MANAGE')}</SectionLabel>
            <LinkTile icon={faSliders} title={t('TENANT_SETTINGS.TILE')} description={t('TENANT_SETTINGS.TILE_DESC')} href="/settings/tenant/settings" testID="organization-settings" />
            <LinkTile icon={faClipboardList} title={t('AUDIT.TITLE')} description={t('AUDIT.TILE_DESC')} href="/settings/tenant/audit-log" testID="organization-audit-log" />
            <LinkTile icon={faUsers} title={t('SETTINGS_HUB.MEMBERS')} description={t('SETTINGS_HUB.MEMBERS_DESC')} href="/settings/tenant/members" testID="organization-members" />
            <LinkTile icon={faEnvelopeOpenText} title={t('SETTINGS_HUB.INVITATIONS')} description={t('SETTINGS_HUB.INVITATIONS_DESC')} href="/settings/tenant/invitations" testID="organization-invitations" />
          </View>
        </>
      ) : (
        <NoOrganization />
      )}
    </Screen>
  );
}
