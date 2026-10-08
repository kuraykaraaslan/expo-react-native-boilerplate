import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Button, Input, Modal, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { AuthClientService } from '@/services/auth/auth.service.client';
import type { TOTPSetupResponse } from '@/services/auth/auth.dto';
import { formatSecret, isCompleteCode, sanitizeCode } from '@/utils/totp';

type Props = { open: boolean; onClose: () => void; onEnabled: () => void };

/**
 * Authenticator-app enrolment: setup (secret + otpauth link) → confirm with a code → backup codes.
 * The secret and the backup codes live in this component's state only: never stored, never logged.
 */
export function TotpSetupModal({ open, onClose, onEnabled }: Props) {
  const { t } = useTranslation();
  const [setup, setSetup] = useState<TOTPSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [verifying, setVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  function reset() {
    setSetup(null);
    setCode('');
    setCodeError(undefined);
    setBackupCodes(null);
  }

  // Ask the server for a fresh secret each time the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    AuthClientService.setupTOTP()
      .then((res) => !cancelled && setSetup(res))
      .catch((err: unknown) => {
        if (cancelled) return;
        handleApiError(err, 'TotpSetupModal.setup');
        onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only (re)run when the modal opens
  }, [open]);

  function close() {
    const finished = backupCodes !== null;
    reset();
    onClose();
    if (finished) onEnabled();
  }

  async function openApp() {
    if (!setup) return;
    try {
      await Linking.openURL(setup.otpauthUrl);
    } catch {
      toast.error(t('SECURITY.NO_AUTH_APP'));
    }
  }

  async function copy(text: string, message: string) {
    await Clipboard.setStringAsync(text);
    await Haptics.selectionAsync();
    toast.success(message);
  }

  async function verify() {
    if (!isCompleteCode(code)) {
      setCodeError(t('SECURITY.CODE_INVALID'));
      return;
    }
    setVerifying(true);
    try {
      const res = await AuthClientService.enableTOTP(code);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('SECURITY.ENABLED'));
      setBackupCodes(res.backupCodes);
    } catch (err: unknown) {
      handleApiError(err, 'TotpSetupModal.verify');
    } finally {
      setVerifying(false);
    }
  }

  // Step 3: backup codes. They are shown once; the only way out is "done".
  if (backupCodes) {
    return (
      <Modal
        open={open}
        onClose={() => {}}
        title={t('SECURITY.BACKUP_TITLE')}
        description={t('SECURITY.BACKUP_DESC')}
        footer={
          <>
            <Button variant="outline" onPress={() => copy(backupCodes.join('\n'), t('SECURITY.CODES_COPIED'))} testID="security-backup-copy">
              {t('SECURITY.COPY_CODES')}
            </Button>
            <Button onPress={close} testID="security-backup-done">
              {t('SECURITY.BACKUP_SAVED')}
            </Button>
          </>
        }
      >
        <View className="flex-row flex-wrap gap-2" testID="security-backup-codes">
          {backupCodes.map((c) => (
            <View key={c} className="rounded-md border border-border bg-surface-overlay px-3 py-2">
              <Text className="font-mono text-sm tracking-widest text-text-primary" selectable>
                {c}
              </Text>
            </View>
          ))}
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={verifying ? () => {} : close}
      title={t('SECURITY.SETUP_TITLE')}
      description={t('SECURITY.SETUP_DESC')}
      footer={
        <>
          <Button variant="ghost" onPress={close} disabled={verifying} testID="security-setup-cancel">
            {t('COMMON.CANCEL')}
          </Button>
          <Button loading={verifying} disabled={!setup} onPress={verify} testID="security-setup-verify">
            {t('SECURITY.SETUP_VERIFY')}
          </Button>
        </>
      }
    >
      <View className="gap-4">
        <Button variant="outline" disabled={!setup} onPress={openApp} testID="security-setup-open-app">
          {t('SECURITY.OPEN_APP')}
        </Button>
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-text-primary">{t('SECURITY.SECRET_LABEL')}</Text>
          <View className="flex-row items-center gap-2 rounded-md border border-border bg-surface-overlay px-3 py-2">
            <Text className="min-w-0 flex-1 font-mono text-sm tracking-wider text-text-primary" selectable testID="security-setup-secret">
              {setup ? formatSecret(setup.secret) : '…'}
            </Text>
            <Button size="sm" variant="ghost" disabled={!setup} onPress={() => setup && copy(setup.secret, t('SECURITY.KEY_COPIED'))} testID="security-setup-copy">
              {t('SECURITY.COPY_KEY')}
            </Button>
          </View>
        </View>
        <Input
          label={t('SECURITY.CODE_LABEL')}
          hint={t('SECURITY.CODE_HINT')}
          value={code}
          onChangeText={(v) => {
            setCode(sanitizeCode(v));
            setCodeError(undefined);
          }}
          error={codeError}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          inputClassName="text-center text-xl tracking-[8px]"
          returnKeyType="go"
          onSubmitEditing={verify}
          testID="security-setup-code"
        />
      </View>
    </Modal>
  );
}
