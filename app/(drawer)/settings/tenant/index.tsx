import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { faEnvelopeOpenText, faUsers } from '@fortawesome/free-solid-svg-icons';
import { RoleBadge } from '@/components/common/Badges';
import { LinkTile } from '@/components/common/LinkTile';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SectionLabel } from '@/components/common/SectionLabel';
import { NoOrganization } from '@/components/tenant/NoOrganization';
import { Badge, Card, Text } from '@/components/ui';
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

const STATUS_VARIANT = { ACTIVE: 'success', SUSPENDED: 'error', PENDING_DELETION: 'warning' } as const;

export default function OrganizationScreen() {
  const { t } = useTranslation();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const tenant = membership?.tenant;

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

          <View className="gap-3">
            <SectionLabel>{t('ORGANIZATION.MANAGE')}</SectionLabel>
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
