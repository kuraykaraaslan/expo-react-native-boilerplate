import { useEffect, useRef, useState } from 'react';
import { Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { toast } from 'sonner-native';
import { Button, Input, Modal, Text } from '@/components/ui';
import { env } from '@/libs/env';
import { handleApiError } from '@/libs/errorUtils';
import logger from '@/libs/logger';
import { reauthFailure } from '@/libs/reauth';
import type { DataExportResponse } from '@/services/compliance/compliance.dto';
import { ComplianceClientService } from '@/services/compliance/compliance.service.client';
import { useAuthStore } from '@/stores/authStore';
import { getActiveTenantId } from '@/stores/tenantStore';
import { safeWebUrl } from '@/utils/notification';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Whether the account has a password to confirm with (null: unknown, so ask and let the server decide). */
  hasPassword: boolean | null;
};

/**
 * Export of the person's own data held by the ACTIVE organization (plus their account record).
 * The server answers a short-lived link to the stored dossier, or the dossier itself when storage is
 * unavailable. The link opens in the in-app browser; the account record (and an inline dossier) go
 * through the system share sheet. An answer that arrives after an organization switch or a sign-out is
 * dropped, never shown: it is personal data of the organization the request was made for.
 */
export function ExportDataModal({ open, onClose, hasPassword }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [askPassword, setAskPassword] = useState(hasPassword !== false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DataExportResponse | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const link = result?.url ? safeWebUrl(result.url, env.EXPO_PUBLIC_API_URL) : null;

  async function requestExport() {
    if (busy || (askPassword && !password)) return;
    const tenantAtStart = getActiveTenantId();
    setBusy(true);
    setPasswordError(undefined);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const answer = await ComplianceClientService.requestDataExport(tenantAtStart, askPassword ? password : undefined);
      if (!mounted.current || getActiveTenantId() !== tenantAtStart || !useAuthStore.getState().isAuthenticated) return;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPassword('');
      setResult(answer);
      const safe = answer.url ? safeWebUrl(answer.url, env.EXPO_PUBLIC_API_URL) : null;
      if (safe) void WebBrowser.openBrowserAsync(safe).catch(() => undefined);
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!mounted.current || getActiveTenantId() !== tenantAtStart) return;
      const failure = reauthFailure(err);
      if (failure === 'password-required') {
        setAskPassword(true);
        setPasswordError(t('ACCOUNT_DATA.PASSWORD_REQUIRED'));
      } else if (failure === 'invalid-password') {
        setPasswordError(t('ACCOUNT_DATA.PASSWORD_WRONG'));
      } else {
        handleApiError(err, 'ExportDataModal.requestExport');
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function share() {
    if (!result) return;
    try {
      // The dossier is only here when the server could not store it; the account record is always here.
      const document = { account: result.account, ...(result.dossier ? { dossier: result.dossier } : {}) };
      await Share.share({ title: t('ACCOUNT_DATA.EXPORT_SHARE_TITLE'), message: JSON.stringify(document, null, 2) });
    } catch (err: unknown) {
      logger.warn('[ExportDataModal] share failed', err instanceof Error ? err.name : 'unknown');
      toast.error(t('ACCOUNT_DATA.EXPORT_SHARE_FAILED'));
    }
  }

  const close = busy ? () => {} : onClose;

  if (result) {
    return (
      <Modal
        open={open}
        onClose={close}
        title={t('ACCOUNT_DATA.EXPORT_READY')}
        footer={
          <Button variant="ghost" onPress={onClose} testID="export-data-close">
            {t('COMMON.CLOSE')}
          </Button>
        }
      >
        <View className="gap-3">
          <Text className="text-sm text-text-secondary">{result.url && !link ? t('ACCOUNT_DATA.EXPORT_LINK_UNSAFE') : t('ACCOUNT_DATA.EXPORT_READY_DESC')}</Text>
          {link ? (
            <Button onPress={() => void WebBrowser.openBrowserAsync(link).catch(() => undefined)} testID="export-data-open">
              {t('ACCOUNT_DATA.EXPORT_OPEN')}
            </Button>
          ) : null}
          <Button variant="outline" onPress={share} testID="export-data-share">
            {t('ACCOUNT_DATA.EXPORT_SHARE')}
          </Button>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('ACCOUNT_DATA.EXPORT_TITLE')}
      description={t('ACCOUNT_DATA.EXPORT_DESC')}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy} testID="export-data-cancel">
            {t('COMMON.CANCEL')}
          </Button>
          <Button loading={busy} disabled={askPassword && !password} onPress={requestExport} testID="export-data-confirm">
            {t('ACCOUNT_DATA.EXPORT_CONFIRM')}
          </Button>
        </>
      }
    >
      {askPassword ? (
        <Input
          label={t('ACCOUNT_DATA.PASSWORD_LABEL')}
          type="password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setPasswordError(undefined);
          }}
          error={passwordError}
          autoComplete="current-password"
          textContentType="password"
          editable={!busy}
          returnKeyType="go"
          onSubmitEditing={requestExport}
          testID="export-data-password"
        />
      ) : null}
    </Modal>
  );
}
