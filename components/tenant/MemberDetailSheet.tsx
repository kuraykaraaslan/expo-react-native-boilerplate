import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MemberStatusBadge, RoleBadge } from '@/components/common/Badges';
import { Avatar, Badge, Button, Modal, Spinner, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import type { AuditLog } from '@/services/compliance/compliance.dto';
import type { TenantMember } from '@/services/tenant/tenant.dto';
import { TenantClientService } from '@/services/tenant/tenant.service.client';
import { getActiveTenantId } from '@/stores/tenantStore';
import { formatDate, formatRelative } from '@/utils/format';

const PAGE_SIZE = 10;
const SEVERITY_VARIANT = { low: 'neutral', medium: 'warning', high: 'error', critical: 'error' } as const;

type MemberDetailSheetProps = {
  member: TenantMember | null;
  /** Activity is ADMIN-only on the server (`members.view_activity`); other roles see the profile only. */
  canViewActivity: boolean;
  onClose: () => void;
};

/** Member profile (the suspension reason is an admin note, shown to admins only) plus the member's audit-log timeline (`GET /members/{id}/activity`). */
export function MemberDetailSheet({ member, canViewActivity, onClose }: MemberDetailSheetProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const page = useRef(1); // last page loaded (1-based)
  const seq = useRef(0); // drops answers of a superseded member / closed sheet / organization switch

  const memberId = member?.tenantMemberId;
  const tenantId = member?.tenantId;

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLogs([]);
    setTotal(0);
    setFailed(false);
    if (!memberId || !tenantId || !canViewActivity) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await TenantClientService.getMemberActivity(tenantId, memberId, { page: 1, pageSize: PAGE_SIZE });
      if (mine !== seq.current || getActiveTenantId() !== tenantId) return;
      page.current = 1;
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: unknown) {
      if (mine !== seq.current) return;
      setFailed(true);
      handleApiError(err, 'MemberDetailSheet.load');
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [memberId, tenantId, canViewActivity]);

  useEffect(() => {
    load();
    return () => {
      seq.current += 1;
    };
  }, [load]);

  async function loadMore() {
    if (!memberId || !tenantId || loadingMore || loading) return;
    const mine = seq.current;
    setLoadingMore(true);
    try {
      const res = await TenantClientService.getMemberActivity(tenantId, memberId, { page: page.current + 1, pageSize: PAGE_SIZE });
      if (mine !== seq.current || getActiveTenantId() !== tenantId) return;
      page.current += 1;
      setLogs((prev) => {
        const seen = new Set(prev.map((l) => l.auditLogId));
        return [...prev, ...res.logs.filter((l) => !seen.has(l.auditLogId))];
      });
      setTotal(res.total);
    } catch (err: unknown) {
      if (mine === seq.current) handleApiError(err, 'MemberDetailSheet.loadMore');
    } finally {
      setLoadingMore(false);
    }
  }

  const name = member ? (member.user?.userProfile?.name ?? member.user?.email ?? member.userId) : '';

  return (
    <Modal
      open={member !== null}
      onClose={onClose}
      title={t('MEMBERS.DETAILS')}
      footer={
        <Button variant="ghost" onPress={onClose} testID="members-detail-close">
          {t('COMMON.CLOSE')}
        </Button>
      }
    >
      {member ? (
        <View className="gap-4" testID="members-detail">
          <View className="flex-row items-center gap-3">
            <Avatar name={name} src={member.user?.userProfile?.profilePicture ?? undefined} size="md" />
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-base font-medium text-text-primary" numberOfLines={1}>
                {name}
              </Text>
              {member.user?.email ? (
                <Text className="text-xs text-text-secondary" numberOfLines={1}>
                  {member.user.email}
                </Text>
              ) : null}
              <View className="flex-row flex-wrap items-center gap-1.5">
                <RoleBadge role={member.memberRole} />
                <MemberStatusBadge status={member.memberStatus} />
                <Text className="text-xs text-text-disabled">{t('MEMBERS.JOINED', { date: formatDate(member.createdAt) })}</Text>
              </View>
            </View>
          </View>

          {member.memberStatus === 'SUSPENDED' && (member.suspendedUntil || (canViewActivity && member.suspensionReason)) ? (
            <View className="gap-1 rounded-lg border border-border bg-surface-overlay px-3 py-2" testID="members-detail-suspension">
              {member.suspendedUntil ? <Text className="text-xs text-text-secondary">{t('MEMBERS.SUSPENDED_UNTIL', { date: formatDate(member.suspendedUntil) })}</Text> : null}
              {canViewActivity && member.suspensionReason ? <Text className="text-xs text-text-secondary">{t('MEMBERS.SUSPENDED_REASON', { reason: member.suspensionReason })}</Text> : null}
            </View>
          ) : null}

          {canViewActivity ? (
            <View className="gap-1">
              <Text className="text-sm font-medium text-text-primary">{t('MEMBERS.ACTIVITY')}</Text>
              {loading ? (
                <View className="items-center py-6" accessibilityState={{ busy: true }}>
                  <Spinner size="md" />
                </View>
              ) : failed ? (
                <View className="items-start gap-2 py-2">
                  <Text className="text-sm text-text-secondary">{t('MEMBERS.ACTIVITY_FAILED')}</Text>
                  <Button variant="outline" size="sm" onPress={load} testID="members-activity-retry">
                    {t('COMMON.RETRY')}
                  </Button>
                </View>
              ) : logs.length === 0 ? (
                <Text className="py-2 text-sm text-text-secondary">{t('MEMBERS.ACTIVITY_EMPTY')}</Text>
              ) : (
                logs.map((l, i) => (
                  <View key={l.auditLogId} className={`gap-1 py-3 ${i === logs.length - 1 ? '' : 'border-b border-border'}`} testID={`members-activity-${l.auditLogId}`}>
                    <View className="flex-row items-center gap-2">
                      <Text className="min-w-0 flex-1 text-sm text-text-primary" numberOfLines={1}>
                        {l.action}
                      </Text>
                      <Badge variant={SEVERITY_VARIANT[l.severity]} size="sm">
                        {t(`AUDIT.SEV_${l.severity}`)}
                      </Badge>
                    </View>
                    <Text className="text-xs text-text-secondary" numberOfLines={1}>
                      {[l.resourceType, formatRelative(l.createdAt)].filter(Boolean).join('  ·  ')}
                    </Text>
                  </View>
                ))
              )}
              {!loading && !failed && logs.length < total ? (
                <Button variant="outline" size="sm" loading={loadingMore} onPress={loadMore} testID="members-activity-more" className="mt-2 self-center">
                  {t('COMMON.LOAD_MORE')}
                </Button>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </Modal>
  );
}
