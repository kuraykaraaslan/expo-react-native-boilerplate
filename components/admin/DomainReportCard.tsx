import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Text } from '@/components/ui';
import logger from '@/libs/logger';
import type { DomainReport } from '@/services/platform/domain.dto';
import { DomainClientService } from '@/services/platform/domain.service.client';
import { useTenantStore } from '@/stores/tenantStore';

type Props = {
  /** Bump to reload (pull to refresh, after a verify / SSL check / add / remove). */
  reloadKey?: number;
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-[30%] flex-1 gap-0.5 rounded-lg border border-border bg-surface-raised p-3" accessible accessibilityLabel={`${label}: ${value}`}>
      <Text className="text-xs text-text-secondary" numberOfLines={2}>
        {label}
      </Text>
      <Text className="text-lg font-bold text-text-primary">{value}</Text>
    </View>
  );
}

/** Read-only domain health: counts, certificates close to expiry and how long ago each domain was verified. */
export function DomainReportCard({ reloadKey = 0 }: Props) {
  const { t } = useTranslation();
  const tenantId = useTenantStore((s) => s.selectedTenantMembership?.tenantId);
  const [report, setReport] = useState<DomainReport | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Another organization has its own domains: never show the previous one's report while loading.
  useEffect(() => {
    setReport(null);
    setFailed(false);
    setLoading(true);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    let live = true;
    setFailed(false);
    DomainClientService.getReport()
      .then((res) => {
        if (live && useTenantStore.getState().selectedTenantMembership?.tenantId === tenantId) setReport(res); // dropped after an organization switch
      })
      .catch((err: unknown) => {
        // The report permission is separate from the list's: a refusal is an empty card, not a toast.
        logger.warn('[DomainReportCard]', err);
        if (live) {
          setReport(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [tenantId, reloadKey]);

  const s = report?.snapshot;
  return (
    <Card title={t('DOMAINS.REPORT_TITLE')} subtitle={t('DOMAINS.REPORT_DESC')} loading={loading && !report}>
      {failed ? <Text className="text-sm text-text-secondary">{t('DOMAINS.REPORT_UNAVAILABLE')}</Text> : null}
      {report && s ? (
        s.totalDomains === 0 ? (
          <Text className="text-sm text-text-secondary">{t('DOMAINS.REPORT_EMPTY')}</Text>
        ) : (
          <View className="gap-4" testID="domains-report">
            <View className="flex-row flex-wrap gap-2">
              <Stat label={t('DOMAINS.REPORT_TOTAL')} value={s.totalDomains} />
              <Stat label={t('DOMAINS.REPORT_VERIFIED')} value={s.verified} />
              <Stat label={t('DOMAINS.REPORT_UNVERIFIED')} value={s.unverified} />
              <Stat label={t('DOMAINS.REPORT_DNS_FAILED')} value={s.dnsFailed} />
              <Stat label={t('DOMAINS.REPORT_SSL_ACTIVE')} value={s.sslActive} />
              <Stat label={t('DOMAINS.REPORT_SSL_EXPIRING')} value={s.sslExpiring} />
              <Stat label={t('DOMAINS.REPORT_SSL_FAILED')} value={s.sslFailed} />
              <Stat label={t('DOMAINS.REPORT_SSL_NONE')} value={s.sslNone} />
            </View>

            {report.sslExpiry.length > 0 ? (
              <View className="gap-1">
                <Text className="text-sm font-medium text-text-primary">{t('DOMAINS.REPORT_EXPIRY_TITLE')}</Text>
                {report.sslExpiryWarningDays > 0 ? <Text className="text-xs text-text-secondary">{t('DOMAINS.REPORT_EXPIRY_NOTE', { days: report.sslExpiryWarningDays })}</Text> : null}
                {report.sslExpiry.map((row) => (
                  <View key={row.tenantDomainId} className="flex-row items-center gap-2 py-1.5" testID={`domains-report-expiry-${row.tenantDomainId}`}>
                    <Text className="min-w-0 flex-1 text-sm text-text-primary" numberOfLines={1}>
                      {row.domain}
                    </Text>
                    {row.atRisk ? (
                      <Badge variant="warning" size="sm">
                        {t('DOMAINS.REPORT_AT_RISK')}
                      </Badge>
                    ) : null}
                    <Text className="text-xs text-text-secondary">
                      {row.daysUntilExpiry == null
                        ? t('DOMAINS.REPORT_NO_DATA')
                        : row.daysUntilExpiry < 0
                          ? t('DOMAINS.REPORT_EXPIRED_AGO', { days: Math.abs(row.daysUntilExpiry) })
                          : t('DOMAINS.REPORT_DAYS_LEFT', { days: row.daysUntilExpiry })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {report.dnsAge.length > 0 ? (
              <View className="gap-1">
                <Text className="text-sm font-medium text-text-primary">{t('DOMAINS.REPORT_DNS_TITLE')}</Text>
                {report.dnsAge.map((row) => (
                  <View key={row.tenantDomainId} className="flex-row items-center gap-2 py-1.5" testID={`domains-report-dns-${row.tenantDomainId}`}>
                    <Text className="min-w-0 flex-1 text-sm text-text-primary" numberOfLines={1}>
                      {row.domain}
                    </Text>
                    <Text className="text-xs text-text-secondary">
                      {row.daysSinceVerified == null ? t('DOMAINS.REPORT_NOT_VERIFIED') : t('DOMAINS.REPORT_VERIFIED_AGO', { days: row.daysSinceVerified })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )
      ) : null}
    </Card>
  );
}
