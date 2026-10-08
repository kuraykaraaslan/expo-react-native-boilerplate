import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { NoOrganization } from '@/components/tenant/NoOrganization';
import { Badge, Button, Card, EmptyState, Select, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import type { AuditLog, AuditSeverity } from '@/services/compliance/compliance.dto';
import { ComplianceClientService } from '@/services/compliance/compliance.service.client';
import { useTenantStore } from '@/stores/tenantStore';
import { formatRelative } from '@/utils/format';

const PAGE_SIZE = 20;
const ALL = 'all';
const SEVERITIES: AuditSeverity[] = ['low', 'medium', 'high', 'critical'];
const SEVERITY_VARIANT = { low: 'neutral', medium: 'warning', high: 'error', critical: 'error' } as const;

function AuditRow({ item, last }: { item: AuditLog; last: boolean }) {
  const { t } = useTranslation();
  const actor = item.actorType === 'SYSTEM' ? t('AUDIT.ACTOR_SYSTEM') : item.actorType === 'API_KEY' ? t('AUDIT.ACTOR_API_KEY') : item.actorId ? item.actorId.slice(0, 8) : t('AUDIT.ACTOR_UNKNOWN');
  return (
    <View className={`gap-1 py-3 ${last ? '' : 'border-b border-border'}`} testID={`audit-row-${item.auditLogId}`}>
      <View className="flex-row items-center gap-2">
        <Text className="min-w-0 flex-1 text-sm font-medium text-text-primary" numberOfLines={1}>
          {item.action}
        </Text>
        <Badge variant={SEVERITY_VARIANT[item.severity]} size="sm">
          {t(`AUDIT.SEV_${item.severity}`)}
        </Badge>
      </View>
      <Text className="text-xs text-text-secondary" numberOfLines={1}>
        {[actor, item.resourceType ? `${item.resourceType}${item.resourceId ? ` ${item.resourceId.slice(0, 8)}` : ''}` : null, formatRelative(item.createdAt)]
          .filter(Boolean)
          .join('  ·  ')}
      </Text>
    </View>
  );
}

export default function AuditLogScreen() {
  const { t } = useTranslation();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const tenantId = membership?.tenantId;
  // audit_log.logs.read is ADMIN on the server; others get a note and no request.
  const canRead = membership?.memberRole === 'OWNER' || membership?.memberRole === 'ADMIN';

  const [severity, setSeverity] = useState<string>(ALL);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const page = useRef(1); // last page loaded (1-based)
  const seq = useRef(0); // drops answers of a superseded filter / tenant

  const load = useCallback(async () => {
    if (!tenantId || !canRead) return;
    const mine = ++seq.current;
    try {
      const res = await ComplianceClientService.getAuditLogs({
        page: 1,
        pageSize: PAGE_SIZE,
        severity: severity === ALL ? undefined : (severity as AuditSeverity),
      });
      if (mine !== seq.current) return;
      page.current = 1;
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: unknown) {
      if (mine === seq.current) handleApiError(err, 'AuditLogScreen.load');
    }
  }, [tenantId, canRead, severity]);

  useEffect(() => {
    setLoading(true);
    setLogs([]);
    load().finally(() => setLoading(false));
  }, [load]);

  async function loadMore() {
    if (loadingMore || loading) return;
    const mine = seq.current;
    setLoadingMore(true);
    try {
      const res = await ComplianceClientService.getAuditLogs({
        page: page.current + 1,
        pageSize: PAGE_SIZE,
        severity: severity === ALL ? undefined : (severity as AuditSeverity),
      });
      if (mine !== seq.current) return;
      page.current += 1;
      setLogs((prev) => {
        const seen = new Set(prev.map((l) => l.auditLogId));
        return [...prev, ...res.logs.filter((l) => !seen.has(l.auditLogId))];
      });
      setTotal(res.total);
    } catch (err: unknown) {
      handleApiError(err, 'AuditLogScreen.loadMore');
    } finally {
      setLoadingMore(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const header = (
    <ScreenHeader back={{ label: t('ORGANIZATION.TITLE'), href: '/settings/tenant' }} title={t('AUDIT.TITLE')} subtitle={t('AUDIT.SUBTITLE')} />
  );

  if (!membership) {
    return (
      <Screen>
        {header}
        <NoOrganization />
      </Screen>
    );
  }

  if (!canRead) {
    return (
      <Screen>
        {header}
        <Text className="px-1 text-sm text-text-secondary">{t('AUDIT.ADMIN_ONLY')}</Text>
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {header}
      <Select
        id="audit-severity"
        label={t('AUDIT.FILTER_SEVERITY')}
        value={severity}
        onChange={setSeverity}
        options={[{ value: ALL, label: t('AUDIT.ALL') }, ...SEVERITIES.map((s) => ({ value: s, label: t(`AUDIT.SEV_${s}`) }))]}
      />
      <Card loading={loading}>
        {logs.length === 0 ? (
          <EmptyState icon={faClipboardList} title={t('AUDIT.EMPTY')} description={t('AUDIT.EMPTY_DESC')} className="py-8" />
        ) : (
          logs.map((l, i) => <AuditRow key={l.auditLogId} item={l} last={i === logs.length - 1} />)
        )}
        {logs.length < total ? (
          <Button variant="outline" size="sm" loading={loadingMore} onPress={loadMore} testID="audit-load-more" className="mt-3 self-center">
            <Text className="text-xs font-medium text-text-primary">{t('COMMON.LOAD_MORE')}</Text>
          </Button>
        ) : null}
      </Card>
    </Screen>
  );
}
