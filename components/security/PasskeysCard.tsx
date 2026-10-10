import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PasskeyRenameModal } from '@/components/security/PasskeyRenameModal';
import { Button, Card, EmptyState, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { passkeysAvailable, registerPasskey, type PasskeyFailure } from '@/libs/passkey';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import type { Passkey } from '@/services/auth/passkey.dto';
import { PasskeyClientService } from '@/services/auth/passkey.service.client';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { formatDate } from '@/utils/format';

const FAILURE_KEY: Record<PasskeyFailure, string> = {
  cancelled: 'PASSKEYS.ADD_FAILED',
  'no-credentials': 'PASSKEYS.NO_CREATE_OPTION',
  'already-exists': 'PASSKEYS.ALREADY_ON_DEVICE',
  misconfigured: 'PASSKEYS.MISCONFIGURED',
  unsupported: 'PASSKEYS.ADD_FAILED',
  failed: 'PASSKEYS.ADD_FAILED',
};

function PasskeyRow({ item, last, onRename, onRemove }: { item: Passkey; last: boolean; onRename: () => void; onRemove: () => void }) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const meta = [
    t('PASSKEYS.ADDED', { date: formatDate(item.createdAt) }),
    item.lastUsedAt ? t('PASSKEYS.LAST_USED', { date: formatDate(item.lastUsedAt) }) : t('PASSKEYS.NEVER_USED'),
  ].join(' · ');
  return (
    <View className={`flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-border'}`}>
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-surface-overlay" accessible={false}>
        <FontAwesomeIcon icon={faKey} size={15} color={tokens['text-secondary']} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
          {item.label}
        </Text>
        <Text className="text-xs text-text-secondary" numberOfLines={2}>
          {meta}
        </Text>
      </View>
      <Button size="sm" variant="outline" onPress={onRename} accessibilityLabel={`${t('PASSKEYS.RENAME')}: ${item.label}`} testID={`passkey-rename-${item.credentialId}`}>
        {t('PASSKEYS.RENAME')}
      </Button>
      <Button size="sm" variant="outline" onPress={onRemove} accessibilityLabel={`${t('COMMON.REMOVE')}: ${item.label}`} testID={`passkey-remove-${item.credentialId}`}>
        <Text className="text-xs font-medium text-error">{t('COMMON.REMOVE')}</Text>
      </Button>
    </View>
  );
}

/**
 * Passkeys on the security screen: the account's credentials (the list is per account, the same in every
 * organization), add one on this device, rename, remove. Adding hides itself where passkeys cannot work (Expo Go,
 * web, old OS, no relying-party domain); listing and removing keep working everywhere.
 */
export function PasskeysCard() {
  const { t } = useTranslation();
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [shouldAddBackup, setShouldAddBackup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<Passkey | null>(null);
  const [removing, setRemoving] = useState<Passkey | null>(null);
  const mounted = useRef(true);
  const seq = useRef(0);
  const canAdd = passkeysAvailable();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    const tenantAtStart = getActiveTenantId();
    try {
      const list = await PasskeyClientService.list();
      // An organization switch or a newer load superseded this answer: it is not for the list on screen.
      if (!mounted.current || mine !== seq.current || getActiveTenantId() !== tenantAtStart) return;
      setPasskeys(list.passkeys);
      setShouldAddBackup(list.backupGuidance?.shouldAddBackup ?? false);
    } catch (err: unknown) {
      if (mounted.current && mine === seq.current) handleApiError(err, 'PasskeysCard.load');
    } finally {
      if (mounted.current && mine === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPasskeys([]);
    // A rename or removal that was open belongs to the previous organization's session.
    setRenaming(null);
    setRemoving(null);
    void load();
  }, [load, tenantId]);

  async function add() {
    setAdding(true);
    try {
      const result = await registerPasskey();
      if (!mounted.current) return;
      if (result.status === 'registered') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(t('PASSKEYS.ADDED_TOAST'));
        await load();
      } else if (result.status === 'failed') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.error(t(FAILURE_KEY[result.reason]));
      }
      // 'cancelled' (sheet dismissed) and 'stale' (organization changed meanwhile): say nothing.
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'PasskeysCard.add');
    } finally {
      if (mounted.current) setAdding(false);
    }
  }

  async function remove(item: Passkey) {
    try {
      await PasskeyClientService.remove(item.credentialId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('PASSKEYS.REMOVED'));
      await load();
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'PasskeysCard.remove');
    }
  }

  return (
    <>
      <Card title={t('PASSKEYS.CARD')} subtitle={t('PASSKEYS.CARD_DESC')} loading={loading}>
        {passkeys.length === 0 ? (
          <EmptyState icon={faKey} title={t('PASSKEYS.EMPTY')} description={canAdd ? t('PASSKEYS.EMPTY_DESC') : undefined} className="py-8" />
        ) : (
          passkeys.map((p, i) => (
            <PasskeyRow key={p.credentialId} item={p} last={i === passkeys.length - 1} onRename={() => setRenaming(p)} onRemove={() => setRemoving(p)} />
          ))
        )}
        {shouldAddBackup && canAdd ? (
          <Text className="pb-3 text-xs text-text-secondary" testID="passkeys-backup-hint">
            {t('PASSKEYS.BACKUP_HINT')}
          </Text>
        ) : null}
        {canAdd ? (
          <Button loading={adding} disabled={loading || adding} onPress={() => void add()} testID="passkeys-add">
            {t('PASSKEYS.ADD')}
          </Button>
        ) : (
          <Text className="text-xs text-text-secondary" testID="passkeys-unavailable">
            {t('PASSKEYS.UNAVAILABLE')}
          </Text>
        )}
      </Card>

      {/* Mounted only while open, so every opening starts with the passkey's current name. */}
      {renaming ? <PasskeyRenameModal passkey={renaming} onClose={() => setRenaming(null)} onRenamed={load} /> : null}
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t('PASSKEYS.REMOVE_TITLE')}
        description={t('PASSKEYS.REMOVE_DESC', { name: removing?.label ?? '' })}
        confirmLabel={t('COMMON.REMOVE')}
        onConfirm={() => (removing ? remove(removing) : undefined)}
      />
    </>
  );
}
