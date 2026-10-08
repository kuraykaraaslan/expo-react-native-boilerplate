import { useCallback, useEffect, useRef, useState } from 'react';
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

const PAGE_SIZE = 20;

type RowActions = { onRevoke: () => void; onResend: () => void; onRemind: () => void };

function InvitationRow({ item, last, actions }: { item: Invitation; last: boolean; actions?: RowActions }) {
  const { t } = useTranslation();
  const who = item.email ?? '';
  return (
    <View className={`gap-1.5 py-3 ${last ? '' : 'border-b border-border'}`} testID={`invitations-row-${item.invitationId}`}>
      <View className="flex-row items-center gap-3">
        <Text className="min-w-0 flex-1 text-sm font-medium text-text-primary" numberOfLines={1}>
          {item.email ?? '—'}
        </Text>
      </View>
      {actions ? (
        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" variant="outline" onPress={actions.onRemind} accessibilityLabel={`${t('INVITATIONS.REMIND')}: ${who}`}>
            <Text className="text-xs font-medium text-text-primary">{t('INVITATIONS.REMIND')}</Text>
          </Button>
          <Button size="sm" variant="outline" onPress={actions.onResend} accessibilityLabel={`${t('INVITATIONS.RESEND')}: ${who}`}>
            <Text className="text-xs font-medium text-text-primary">{t('INVITATIONS.RESEND')}</Text>
          </Button>
          <Button size="sm" variant="outline" onPress={actions.onRevoke} accessibilityLabel={`${t('INVITATIONS.REVOKE')}: ${who}`}>
            <Text className="text-xs font-medium text-error">{t('INVITATIONS.REVOKE')}</Text>
          </Button>
        </View>
      ) : null}
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
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useRef(1); // last page loaded (1-based)
  const [refreshing, setRefreshing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);

  const load = useCallback(async () => {
    if (!membership) return;
    try {
      const res = await TenantClientService.getInvitations(membership.tenantId, { page: 1, pageSize: PAGE_SIZE });
      page.current = 1;
      setInvitations(res.invitations);
      setTotal(res.total);
    } catch (err: unknown) {
      handleApiError(err, 'InvitationsScreen.load');
    }
  }, [membership]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function loadMore() {
    if (!membership || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await TenantClientService.getInvitations(membership.tenantId, { page: page.current + 1, pageSize: PAGE_SIZE });
      page.current += 1;
      setInvitations((prev) => {
        const seen = new Set(prev.map((i) => i.invitationId));
        return [...prev, ...res.invitations.filter((i) => !seen.has(i.invitationId))];
      });
      setTotal(res.total);
    } catch (err: unknown) {
      handleApiError(err, 'InvitationsScreen.loadMore');
    } finally {
      setLoadingMore(false);
    }
  }

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

  // Resend rotates the token and extends the expiry; remind keeps the expiry. Both re-send the e-mail.
  async function mail(inv: Invitation, kind: 'resend' | 'remind') {
    try {
      const updated =
        kind === 'resend'
          ? await TenantClientService.resendInvitation(inv.tenantId, inv.invitationId)
          : await TenantClientService.remindInvitation(inv.tenantId, inv.invitationId);
      setInvitations((prev) => prev.map((i) => (i.invitationId === inv.invitationId ? { ...i, ...updated } : i)));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t(kind === 'resend' ? 'INVITATIONS.RESENT' : 'INVITATIONS.REMINDED'));
    } catch (err: unknown) {
      handleApiError(err, `InvitationsScreen.${kind}`);
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
              actions={
                canManage && inv.status === 'PENDING'
                  ? { onRevoke: () => setRevoking(inv), onResend: () => mail(inv, 'resend'), onRemind: () => mail(inv, 'remind') }
                  : undefined
              }
            />
          ))
        )}
        {invitations.length < total ? (
          <Button variant="outline" size="sm" loading={loadingMore} onPress={loadMore} testID="invitations-load-more" className="mt-3 self-center">
            <Text className="text-xs font-medium text-text-primary">{t('COMMON.LOAD_MORE')}</Text>
          </Button>
        ) : null}
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
