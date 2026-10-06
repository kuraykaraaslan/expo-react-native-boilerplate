import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';
import { InvitationStatusBadge, RoleBadge } from '@/components/common/Badges';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { InviteMemberModal } from '@/components/tenant/InviteMemberModal';
import { NoOrganization } from '@/components/tenant/NoOrganization';
import { Button, Card, EmptyState, Text } from '@/components/ui';
import type { Invitation } from '@/services/tenant/tenant.dto';
import { handleApiError } from '@/libs/errorUtils';
import { TenantClientService } from '@/services/tenant/tenant.service.client';
import { useTenantStore } from '@/stores/tenantStore';
import { formatDate } from '@/utils/format';

function InvitationRow({ item, last, onRevoke }: { item: Invitation; last: boolean; onRevoke?: () => void }) {
  const { t } = useTranslation();
  return (
    <View className={`gap-1.5 py-3 ${last ? '' : 'border-b border-border'}`} testID={`invitations-row-${item.invitationId}`}>
      <View className="flex-row items-center gap-3">
        <Text className="min-w-0 flex-1 text-sm font-medium text-text-primary" numberOfLines={1}>
          {item.email ?? '—'}
        </Text>
        {onRevoke ? (
          <Button size="sm" variant="outline" onPress={onRevoke} accessibilityLabel={`${t('INVITATIONS.REVOKE')}: ${item.email ?? ''}`}>
            <Text className="text-xs font-medium text-error">{t('INVITATIONS.REVOKE')}</Text>
          </Button>
        ) : null}
      </View>
      <View className="flex-row flex-wrap items-center gap-1.5">
        <RoleBadge role={item.memberRole} />
        <InvitationStatusBadge status={item.status} />
      </View>
      <Text className="text-xs text-text-secondary">
        {[
          item.createdAt ? t('INVITATIONS.SENT', { date: formatDate(item.createdAt) }) : null,
          item.expiresAt ? t('INVITATIONS.EXPIRES', { date: formatDate(item.expiresAt) }) : null,
        ]
          .filter(Boolean)
          .join('  ·  ')}
      </Text>
    </View>
  );
}

export default function InvitationsScreen() {
  const { t } = useTranslation();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const canManage = membership?.memberRole === 'ADMIN' || membership?.memberRole === 'OWNER';
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);

  const load = useCallback(async () => {
    if (!membership) return;
    try {
      const { invitations: list } = await TenantClientService.getInvitations(membership.tenantId);
      setInvitations(list);
    } catch (err: unknown) {
      handleApiError(err, 'InvitationsScreen.load');
    }
  }, [membership]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function revoke(inv: Invitation) {
    try {
      await TenantClientService.revokeInvitation(inv.tenantId, inv.invitationId);
      setInvitations((prev) => prev.map((i) => (i.invitationId === inv.invitationId ? { ...i, status: 'REVOKED' } : i)));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('INVITATIONS.REVOKED'));
    } catch (err: unknown) {
      handleApiError(err, 'InvitationsScreen.revoke');
    }
  }

  const header = (
    <ScreenHeader
      back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }}
      title={t('INVITATIONS.TITLE')}
      subtitle={t('INVITATIONS.SUBTITLE')}
      actions={membership && canManage ? [{ label: t('INVITATIONS.NEW'), onPress: () => setInviteOpen(true) }] : undefined}
    />
  );

  if (!membership) {
    return (
      <Screen>
        {header}
        <NoOrganization />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {header}
      <Card title={t('INVITATIONS.CARD')} subtitle={t('INVITATIONS.CARD_DESC')} loading={loading}>
        {invitations.length === 0 ? (
          <EmptyState
            icon={faEnvelopeOpenText}
            title={t('INVITATIONS.EMPTY')}
            description={t('INVITATIONS.EMPTY_DESC')}
            actionLabel={canManage ? t('INVITATIONS.NEW') : undefined}
            onAction={canManage ? () => setInviteOpen(true) : undefined}
            className="py-8"
          />
        ) : (
          invitations.map((inv, i) => (
            <InvitationRow
              key={inv.invitationId}
              item={inv}
              last={i === invitations.length - 1}
              onRevoke={canManage && inv.status === 'PENDING' ? () => setRevoking(inv) : undefined}
            />
          ))
        )}
      </Card>

      <InviteMemberModal tenantId={membership.tenantId} open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={load} />
      <ConfirmDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title={t('INVITATIONS.REVOKE_TITLE')}
        description={t('INVITATIONS.REVOKE_DESC', { email: revoking?.email ?? '' })}
        confirmLabel={t('INVITATIONS.REVOKE')}
        onConfirm={() => (revoking ? revoke(revoking) : undefined)}
      />
    </Screen>
  );
}
