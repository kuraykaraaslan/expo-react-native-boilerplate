import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { DomainReportCard } from '@/components/admin/DomainReportCard';
import { DOMAIN_STATUS_VARIANT, DomainDetailModal, SSL_STATUS_VARIANT } from '@/components/admin/DomainDetailModal';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { NoOrganization } from '@/components/tenant/NoOrganization';
import { Badge, Button, Card, EmptyState, Input, Modal, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import type { Domain } from '@/services/platform/domain.dto';
import { DomainClientService } from '@/services/platform/domain.service.client';
import { useTenantStore } from '@/stores/tenantStore';

// A hostname: labels of letters/digits/hyphens, a dot, a TLD. The server validates and blocklists too.
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export default function DomainsScreen() {
  const { t } = useTranslation();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const canManage = membership?.memberRole === 'OWNER' || membership?.memberRole === 'ADMIN';
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [host, setHost] = useState('');
  const [hostError, setHostError] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Domain | null>(null);
  /** Bumped whenever the list reloads, so the health report reloads with it. */
  const [reportKey, setReportKey] = useState(0);

  const load = useCallback(async () => {
    if (!membership || !canManage) return;
    const tenant = membership.tenantId;
    try {
      const res = await DomainClientService.list({ pageSize: 100 });
      if (useTenantStore.getState().selectedTenantMembership?.tenantId !== tenant) return; // switched meanwhile
      setDomains(res.domains);
    } catch (err: unknown) {
      handleApiError(err, 'DomainsScreen.load');
    }
  }, [membership, canManage]);

  const activeTenant = membership?.tenantId;
  useEffect(() => {
    setDomains([]);
    setSelected(null);
    setLoading(true);
  }, [activeTenant]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    setReportKey((n) => n + 1);
    await load();
    setRefreshing(false);
  }

  async function add() {
    const value = host.trim().toLowerCase();
    if (!HOSTNAME.test(value)) return setHostError(t('DOMAINS.DOMAIN_INVALID'));
    setHostError(undefined);
    setAdding(true);
    try {
      const created = await DomainClientService.create(value);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('DOMAINS.ADDED'));
      setAddOpen(false);
      setHost('');
      setReportKey((n) => n + 1);
      await load();
      setSelected(created); // the next step is the DNS record shown in the detail
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'DomainsScreen.add');
    } finally {
      setAdding(false);
    }
  }

  const header = (
    <ScreenHeader
      back={{ label: t('ORGANIZATION.TITLE'), href: '/settings/tenant' }}
      title={t('DOMAINS.TITLE')}
      subtitle={t('DOMAINS.SUBTITLE')}
      actions={membership && canManage ? [{ label: t('DOMAINS.ADD'), onPress: () => setAddOpen(true) }] : undefined}
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
  if (!canManage) {
    return (
      <Screen>
        {header}
        <Text className="px-1 text-sm text-text-secondary">{t('DOMAINS.NO_ACCESS')}</Text>
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {header}
      <Card title={t('DOMAINS.CARD')} subtitle={t('DOMAINS.CARD_DESC')} loading={loading}>
        {domains.length === 0 ? (
          <EmptyState icon={faGlobe} title={t('DOMAINS.EMPTY')} description={t('DOMAINS.EMPTY_DESC')} actionLabel={t('DOMAINS.ADD')} onAction={() => setAddOpen(true)} className="py-8" />
        ) : (
          domains.map((d, i) => (
            <Pressable
              key={d.tenantDomainId}
              onPress={() => setSelected(d)}
              accessibilityRole="button"
              accessibilityLabel={d.domain}
              testID={`domains-row-${d.tenantDomainId}`}
              className={`gap-1.5 py-3 ${i === domains.length - 1 ? '' : 'border-b border-border'}`}
            >
              <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
                {d.domain}
              </Text>
              <View className="flex-row flex-wrap items-center gap-1.5">
                <Badge variant={DOMAIN_STATUS_VARIANT[d.domainStatus] ?? 'neutral'} size="sm" dot>
                  {t(`DOMAINS.STATUS_${d.domainStatus}`, { defaultValue: d.domainStatus })}
                </Badge>
                <Badge variant={SSL_STATUS_VARIANT[d.sslStatus] ?? 'neutral'} size="sm">
                  {t('DOMAINS.SSL_LABEL', { status: t(`DOMAINS.SSL_${d.sslStatus}`, { defaultValue: d.sslStatus }) })}
                </Badge>
                {d.isPrimary ? (
                  <Badge variant="primary" size="sm">
                    {t('DOMAINS.PRIMARY')}
                  </Badge>
                ) : null}
              </View>
            </Pressable>
          ))
        )}
      </Card>

      <DomainReportCard reloadKey={reportKey} />

      <Modal
        open={addOpen}
        onClose={adding ? () => {} : () => setAddOpen(false)}
        title={t('DOMAINS.ADD')}
        description={t('DOMAINS.ADD_DESC')}
        footer={
          <>
            <Button variant="ghost" onPress={() => setAddOpen(false)} disabled={adding}>
              {t('COMMON.CANCEL')}
            </Button>
            <Button loading={adding} onPress={add} testID="domains-add-submit">
              {t('DOMAINS.ADD')}
            </Button>
          </>
        }
      >
        <Input
          label={t('DOMAINS.DOMAIN')}
          value={host}
          onChangeText={(v) => {
            setHost(v);
            setHostError(undefined);
          }}
          error={hostError}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="app.example.com"
          testID="domains-host"
        />
      </Modal>
      <DomainDetailModal
        domain={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          setReportKey((n) => n + 1);
          void load();
        }}
      />
    </Screen>
  );
}
