import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import { ApiKeyReports } from '@/components/admin/ApiKeyReports';
import { CreateApiKeyModal } from '@/components/admin/CreateApiKeyModal';
import { IssuedKeyModal } from '@/components/admin/IssuedKeyModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { NoOrganization } from '@/components/tenant/NoOrganization';
import { Badge, Button, Card, EmptyState, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import type { ApiKey } from '@/services/platform/apiKey.dto';
import { ApiKeyClientService } from '@/services/platform/apiKey.service.client';
import { useTenantStore } from '@/stores/tenantStore';
import { formatDate } from '@/utils/format';

function KeyRow({ item, last, onRotate, onRevoke }: { item: ApiKey; last: boolean; onRotate: () => void; onRevoke: () => void }) {
  const { t } = useTranslation();
  return (
    <View className={`gap-1.5 py-3 ${last ? '' : 'border-b border-border'}`} testID={`api-keys-row-${item.apiKeyId}`}>
      <View className="flex-row items-center gap-2">
        <Text className="min-w-0 flex-1 text-sm font-medium text-text-primary" numberOfLines={1}>
          {item.name}
        </Text>
        <Badge variant={item.isActive ? 'success' : 'neutral'} size="sm" dot>
          {t(item.isActive ? 'API_KEYS.ACTIVE' : 'API_KEYS.INACTIVE')}
        </Badge>
      </View>
      <View className="flex-row flex-wrap gap-1.5">
        {item.scopes.map((s) => (
          <Badge key={s} variant="neutral" size="sm">
            {s}
          </Badge>
        ))}
      </View>
      <Text className="text-xs text-text-secondary">
        {[
          item.lastUsedAt ? t('API_KEYS.LAST_USED', { date: formatDate(item.lastUsedAt) }) : t('API_KEYS.NEVER_USED'),
          item.expiresAt ? t('API_KEYS.EXPIRES_ON', { date: formatDate(item.expiresAt) }) : null,
        ]
          .filter(Boolean)
          .join('  ·  ')}
      </Text>
      {item.isActive ? (
        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" variant="outline" onPress={onRotate} accessibilityLabel={`${t('API_KEYS.ROTATE')}: ${item.name}`}>
            <Text className="text-xs font-medium text-text-primary">{t('API_KEYS.ROTATE')}</Text>
          </Button>
          <Button size="sm" variant="outline" onPress={onRevoke} accessibilityLabel={`${t('API_KEYS.REVOKE')}: ${item.name}`}>
            <Text className="text-xs font-medium text-error">{t('API_KEYS.REVOKE')}</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
}

export default function ApiKeysScreen() {
  const { t } = useTranslation();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const canManage = membership?.memberRole === 'OWNER' || membership?.memberRole === 'ADMIN';
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [rotating, setRotating] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  /** Bumped whenever the keys change, so the read-only reports below reload too. */
  const [reportsKey, setReportsKey] = useState(0);
  /** The plaintext key of the last create / rotate — held here only until the user confirms they saved it. */
  const [rawKey, setRawKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!membership || !canManage) return;
    const tenant = membership.tenantId;
    try {
      const res = await ApiKeyClientService.list({ pageSize: 100 });
      if (useTenantStore.getState().selectedTenantMembership?.tenantId !== tenant) return; // switched meanwhile
      setKeys(res.keys);
    } catch (err: unknown) {
      handleApiError(err, 'ApiKeysScreen.load');
    }
  }, [membership, canManage]);

  // Another organization has its own keys: never show (or keep a freshly issued key from) the previous one.
  const activeTenant = membership?.tenantId;
  useEffect(() => {
    setKeys([]);
    setRawKey(null);
    setLoading(true);
  }, [activeTenant]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Leaving the screen must not leave a key behind.
  useEffect(() => () => setRawKey(null), []);

  async function refresh() {
    setRefreshing(true);
    setReportsKey((n) => n + 1);
    await load();
    setRefreshing(false);
  }

  async function rotate(key: ApiKey) {
    try {
      const issued = await ApiKeyClientService.rotate(key.apiKeyId);
      setRawKey(issued.rawKey);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('API_KEYS.ROTATED'));
      setReportsKey((n) => n + 1);
      await load();
    } catch (err: unknown) {
      handleApiError(err, 'ApiKeysScreen.rotate');
    }
  }

  async function revoke(key: ApiKey) {
    try {
      await ApiKeyClientService.revoke(key.apiKeyId);
      setKeys((prev) => prev.map((k) => (k.apiKeyId === key.apiKeyId ? { ...k, isActive: false } : k)));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('API_KEYS.REVOKED'));
      setReportsKey((n) => n + 1);
    } catch (err: unknown) {
      handleApiError(err, 'ApiKeysScreen.revoke');
    }
  }

  async function revokeAll() {
    try {
      const count = await ApiKeyClientService.revokeAll();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('API_KEYS.REVOKED_ALL', { count }));
      setReportsKey((n) => n + 1);
      await load();
    } catch (err: unknown) {
      handleApiError(err, 'ApiKeysScreen.revokeAll');
    }
  }

  const activeCount = keys.filter((k) => k.isActive).length;
  const header = (
    <ScreenHeader
      back={{ label: t('ORGANIZATION.TITLE'), href: '/settings/tenant' }}
      title={t('API_KEYS.TITLE')}
      subtitle={t('API_KEYS.SUBTITLE')}
      actions={membership && canManage ? [{ label: t('API_KEYS.NEW'), onPress: () => setCreateOpen(true) }] : undefined}
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
        <Text className="px-1 text-sm text-text-secondary">{t('API_KEYS.NO_ACCESS')}</Text>
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {header}
      <Card title={t('API_KEYS.CARD')} subtitle={t('API_KEYS.CARD_DESC')} loading={loading}>
        {keys.length === 0 ? (
          <EmptyState icon={faKey} title={t('API_KEYS.EMPTY')} description={t('API_KEYS.EMPTY_DESC')} actionLabel={t('API_KEYS.NEW')} onAction={() => setCreateOpen(true)} className="py-8" />
        ) : (
          keys.map((k, i) => <KeyRow key={k.apiKeyId} item={k} last={i === keys.length - 1} onRotate={() => setRotating(k)} onRevoke={() => setRevoking(k)} />)
        )}
      </Card>

      <ApiKeyReports reloadKey={reportsKey} />

      {activeCount > 0 ? (
        <Card title={t('API_KEYS.DANGER_ZONE')} subtitle={t('API_KEYS.DANGER_DESC')}>
          <Button variant="danger" onPress={() => setRevokingAll(true)} testID="api-keys-revoke-all">
            {t('API_KEYS.REVOKE_ALL')}
          </Button>
        </Card>
      ) : null}

      <CreateApiKeyModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(issued) => { setRawKey(issued.rawKey); setReportsKey((n) => n + 1); void load(); }} />
      <IssuedKeyModal rawKey={rawKey} onDone={() => setRawKey(null)} />
      <ConfirmDialog
        open={rotating !== null}
        onClose={() => setRotating(null)}
        title={t('API_KEYS.ROTATE_TITLE')}
        description={t('API_KEYS.ROTATE_DESC', { name: rotating?.name ?? '' })}
        confirmLabel={t('API_KEYS.ROTATE')}
        onConfirm={() => (rotating ? rotate(rotating) : undefined)}
      />
      <ConfirmDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title={t('API_KEYS.REVOKE_TITLE')}
        description={t('API_KEYS.REVOKE_DESC', { name: revoking?.name ?? '' })}
        confirmLabel={t('API_KEYS.REVOKE')}
        onConfirm={() => (revoking ? revoke(revoking) : undefined)}
      />
      <ConfirmDialog
        open={revokingAll}
        onClose={() => setRevokingAll(false)}
        title={t('API_KEYS.REVOKE_ALL_TITLE')}
        description={t('API_KEYS.REVOKE_ALL_DESC', { count: activeCount })}
        confirmLabel={t('API_KEYS.REVOKE_ALL')}
        onConfirm={revokeAll}
      />
    </Screen>
  );
}
