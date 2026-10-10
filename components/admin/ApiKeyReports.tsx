import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Text } from '@/components/ui';
import logger from '@/libs/logger';
import type { ApiKeyActivityReport, ApiKeyRotationAudit } from '@/services/platform/apiKey.dto';
import { ApiKeyClientService } from '@/services/platform/apiKey.service.client';
import { useTenantStore } from '@/stores/tenantStore';
import { formatDate } from '@/utils/format';

type Props = {
  /** Bump to reload both reports (pull to refresh, after a create / rotate / revoke). */
  reloadKey?: number;
};

type State<T> = { data: T | null; failed: boolean; loading: boolean };
const EMPTY = { data: null, failed: false, loading: true } as const;

/** Runs `fetcher` for the active organization; an answer that lands after a switch is dropped. */
function useReport<T>(fetcher: () => Promise<T>, tenantId: string | undefined, reloadKey: number, context: string): State<T> {
  const [state, setState] = useState<State<T>>(EMPTY);

  // Another organization has its own numbers: never show the previous one's while loading.
  useEffect(() => {
    setState(EMPTY);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    let live = true;
    fetcher()
      .then((data) => {
        if (live && useTenantStore.getState().selectedTenantMembership?.tenantId === tenantId) setState({ data, failed: false, loading: false });
      })
      .catch((err: unknown) => {
        // The report permission is separate from the key list's: a refusal is an empty card, not a toast.
        logger.warn(`[${context}]`, err);
        if (live) setState({ data: null, failed: true, loading: false });
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetcher is a static service call
  }, [tenantId, reloadKey]);

  return state;
}

function Summary({ text }: { text: string }) {
  return <Text className="pb-1 text-xs text-text-secondary">{text}</Text>;
}

/** Read-only usage and rotation reports for API keys (trailing 90 days, the server default). */
export function ApiKeyReports({ reloadKey = 0 }: Props) {
  const { t } = useTranslation();
  const tenantId = useTenantStore((s) => s.selectedTenantMembership?.tenantId);
  const activity = useReport<ApiKeyActivityReport>(() => ApiKeyClientService.getActivityReport(), tenantId, reloadKey, 'ApiKeyReports.activity');
  const rotation = useReport<ApiKeyRotationAudit>(() => ApiKeyClientService.getRotationAudit(), tenantId, reloadKey, 'ApiKeyReports.rotation');

  const a = activity.data;
  const r = rotation.data;

  return (
    <>
      <Card title={t('API_KEYS.ACTIVITY_TITLE')} subtitle={t('API_KEYS.ACTIVITY_DESC')} loading={activity.loading}>
        {activity.failed ? <Text className="text-sm text-text-secondary">{t('API_KEYS.REPORT_UNAVAILABLE')}</Text> : null}
        {a ? (
          a.rows.length === 0 ? (
            <Text className="text-sm text-text-secondary">{t('API_KEYS.ACTIVITY_EMPTY')}</Text>
          ) : (
            <View testID="api-keys-activity">
              <Summary
                text={t('API_KEYS.ACTIVITY_SUMMARY', {
                  active: a.summary.activeKeys,
                  inactive: a.summary.inactiveKeys,
                  expired: a.summary.expiredKeys,
                  never: a.summary.neverUsed,
                })}
              />
              <Summary text={t('API_KEYS.ACTIVITY_TOTAL', { count: a.summary.totalUsage })} />
              {a.rows.map((row, i) => (
                <View key={row.apiKeyId} className={`gap-1 py-3 ${i === a.rows.length - 1 ? '' : 'border-b border-border'}`} testID={`api-keys-activity-${row.apiKeyId}`}>
                  <View className="flex-row items-center gap-2">
                    <Text className="min-w-0 flex-1 text-sm font-medium text-text-primary" numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Badge variant={row.isActive ? 'success' : 'neutral'} size="sm" dot>
                      {t(row.isActive ? 'API_KEYS.ACTIVE' : 'API_KEYS.INACTIVE')}
                    </Badge>
                  </View>
                  <Text className="text-xs text-text-secondary">
                    {[
                      t('API_KEYS.ACTIVITY_USES', { count: row.usageCount }),
                      row.lastUsedAt ? t('API_KEYS.LAST_USED', { date: formatDate(row.lastUsedAt) }) : t('API_KEYS.NEVER_USED'),
                      row.lastUsedIp ?? null,
                    ]
                      .filter(Boolean)
                      .join('  ·  ')}
                  </Text>
                </View>
              ))}
            </View>
          )
        ) : null}
      </Card>

      <Card title={t('API_KEYS.ROTATION_TITLE')} subtitle={t('API_KEYS.ROTATION_DESC')} loading={rotation.loading}>
        {rotation.failed ? <Text className="text-sm text-text-secondary">{t('API_KEYS.REPORT_UNAVAILABLE')}</Text> : null}
        {r ? (
          r.rows.length === 0 ? (
            <Text className="text-sm text-text-secondary">{t('API_KEYS.ROTATION_EMPTY')}</Text>
          ) : (
            <View testID="api-keys-rotation">
              <Summary text={t('API_KEYS.ROTATION_SUMMARY', { rotations: r.summary.rotations, grace: r.summary.graceActive, revoked: r.summary.revokedImmediately })} />
              {r.rows.map((row, i) => (
                <View key={`${row.apiKeyId}-${row.successorKeyId ?? i}`} className={`gap-1 py-3 ${i === r.rows.length - 1 ? '' : 'border-b border-border'}`} testID={`api-keys-rotation-${row.apiKeyId}`}>
                  <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text className="text-xs text-text-secondary">
                    {[
                      t('API_KEYS.ROTATION_REPLACED_BY', { name: row.successorName ?? t('API_KEYS.ROTATION_OTHER_KEY') }),
                      row.rotatedAt ? formatDate(row.rotatedAt) : null,
                      row.isActive && row.graceExpiresAt ? t('API_KEYS.ROTATION_GRACE_UNTIL', { date: formatDate(row.graceExpiresAt) }) : null,
                    ]
                      .filter(Boolean)
                      .join('  ·  ')}
                  </Text>
                </View>
              ))}
            </View>
          )
        ) : null}
      </Card>
    </>
  );
}
