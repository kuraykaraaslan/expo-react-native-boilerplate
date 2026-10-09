import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Badge, Button, Modal, Spinner, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import type { Domain, DomainDetail } from '@/services/platform/domain.dto';
import { DomainClientService } from '@/services/platform/domain.service.client';
import { formatDate } from '@/utils/format';

type Props = {
  domain: Domain | null;
  onClose: () => void;
  /** The list should reload: the domain was verified, re-checked or removed. */
  onChanged: () => void;
};

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';
export const DOMAIN_STATUS_VARIANT: Record<string, BadgeVariant> = { ACTIVE: 'success', VERIFIED: 'success', PENDING: 'warning', DNS_FAILED: 'error', INACTIVE: 'neutral' };
export const SSL_STATUS_VARIANT: Record<string, BadgeVariant> = { ACTIVE: 'success', PENDING: 'warning', PROVISIONING: 'warning', EXPIRING: 'warning', EXPIRED: 'error', FAILED: 'error', DISABLED: 'neutral' };

function RecordField({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="gap-1">
      <Text className="text-xs text-text-secondary">{label}</Text>
      <View className="flex-row items-center gap-2 rounded-lg border border-border bg-surface-sunken p-2">
        <Text selectable className="min-w-0 flex-1 font-mono text-xs text-text-primary">
          {value}
        </Text>
        <Button size="xs" variant="outline" onPress={onCopy}>
          <Text className="text-xs font-medium text-text-primary">{t('DOMAINS.COPY')}</Text>
        </Button>
      </View>
    </View>
  );
}

/** Domain status, the DNS record to create at the registrar, and verify / SSL check / remove. */
export function DomainDetailModal({ domain, onClose, onChanged }: Props) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<DomainDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'verify' | 'ssl' | null>(null);
  const [removing, setRemoving] = useState(false);
  const id = domain?.tenantDomainId;

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setDetail(await DomainClientService.get(id));
    } catch (err: unknown) {
      handleApiError(err, 'DomainDetailModal.load');
    }
  }, [id]);

  useEffect(() => {
    setDetail(null);
    if (!id) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [id, load]);

  async function copy(text: string) {
    await Clipboard.setStringAsync(text);
    await Haptics.selectionAsync();
    toast.success(t('DOMAINS.COPIED'));
  }

  async function verify() {
    if (!id) return;
    setBusy('verify');
    try {
      const res = await DomainClientService.verify(id);
      await Haptics.notificationAsync(res.isVerified ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
      (res.isVerified ? toast.success : toast.info)(t(res.isVerified ? 'DOMAINS.VERIFIED_OK' : 'DOMAINS.VERIFIED_NO'));
      await load();
      onChanged();
    } catch (err: unknown) {
      handleApiError(err, 'DomainDetailModal.verify');
    } finally {
      setBusy(null);
    }
  }

  async function checkSsl() {
    if (!id) return;
    setBusy('ssl');
    try {
      await DomainClientService.checkSsl(id);
      toast.success(t('DOMAINS.SSL_CHECKED'));
      await load();
      onChanged();
    } catch (err: unknown) {
      handleApiError(err, 'DomainDetailModal.checkSsl');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!id) return;
    try {
      await DomainClientService.remove(id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('DOMAINS.DELETED'));
      onChanged();
      onClose();
    } catch (err: unknown) {
      handleApiError(err, 'DomainDetailModal.remove');
    }
  }

  const shown = detail?.domain ?? domain;
  const verification = detail?.verification;
  const verified = shown?.domainStatus === 'VERIFIED' || shown?.domainStatus === 'ACTIVE';

  return (
    <>
      <Modal open={domain !== null} onClose={onClose} title={shown?.domain ?? ''} scrollable>
        {shown ? (
          <View className="gap-4">
            <View className="flex-row flex-wrap items-center gap-2">
              <Badge variant={DOMAIN_STATUS_VARIANT[shown.domainStatus] ?? 'neutral'} size="sm" dot>
                {t(`DOMAINS.STATUS_${shown.domainStatus}`, { defaultValue: shown.domainStatus })}
              </Badge>
              <Badge variant={SSL_STATUS_VARIANT[shown.sslStatus] ?? 'neutral'} size="sm">
                {t('DOMAINS.SSL_LABEL', { status: t(`DOMAINS.SSL_${shown.sslStatus}`, { defaultValue: shown.sslStatus }) })}
              </Badge>
              {shown.isPrimary ? (
                <Badge variant="primary" size="sm">
                  {t('DOMAINS.PRIMARY')}
                </Badge>
              ) : null}
            </View>
            {shown.sslExpiresAt ? <Text className="text-xs text-text-secondary">{t('DOMAINS.SSL_EXPIRES', { date: formatDate(shown.sslExpiresAt) })}</Text> : null}

            {loading ? <Spinner /> : null}
            {!verified && verification ? (
              <View className="gap-3">
                <Text className="text-sm font-medium text-text-primary">{t('DOMAINS.DNS_TITLE')}</Text>
                <Text className="text-xs text-text-secondary">{t('DOMAINS.DNS_DESC', { method: verification.method })}</Text>
                <RecordField label={t('DOMAINS.RECORD_NAME')} value={verification.recordName} onCopy={() => copy(verification.recordName)} />
                <RecordField label={t('DOMAINS.RECORD_VALUE')} value={verification.recordValue} onCopy={() => copy(verification.recordValue)} />
              </View>
            ) : null}

            <View className="flex-row flex-wrap gap-2">
              {!verified ? (
                <Button size="sm" loading={busy === 'verify'} onPress={verify} testID="domains-verify">
                  {t('DOMAINS.VERIFY')}
                </Button>
              ) : null}
              <Button size="sm" variant="outline" loading={busy === 'ssl'} onPress={checkSsl} testID="domains-ssl-check">
                <Text className="text-xs font-medium text-text-primary">{t('DOMAINS.CHECK_SSL')}</Text>
              </Button>
              <Button size="sm" variant="outline" onPress={() => setRemoving(true)} testID="domains-delete">
                <Text className="text-xs font-medium text-error">{t('DOMAINS.DELETE')}</Text>
              </Button>
            </View>
          </View>
        ) : null}
      </Modal>
      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        title={t('DOMAINS.DELETE_TITLE')}
        description={t('DOMAINS.DELETE_DESC', { domain: shown?.domain ?? '' })}
        confirmLabel={t('DOMAINS.DELETE')}
        onConfirm={remove}
      />
    </>
  );
}
