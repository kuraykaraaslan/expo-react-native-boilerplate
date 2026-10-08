import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Button, Input, Modal } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { isCompleteCode, sanitizeCode } from '@/utils/totp';

type Props = { open: boolean; onClose: () => void; onDisabled: () => void };

/** Turning the authenticator app off needs a current code from it (the server's rule). */
export function TotpDisableModal({ open, onClose, onDisabled }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function close() {
    setCode('');
    setError(undefined);
    onClose();
  }

  async function disable() {
    if (!isCompleteCode(code)) {
      setError(t('SECURITY.CODE_INVALID'));
      return;
    }
    setBusy(true);
    try {
      await AuthClientService.disableTOTP(code);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('SECURITY.DISABLED'));
      close();
      onDisabled();
    } catch (err: unknown) {
      handleApiError(err, 'TotpDisableModal.disable');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : close}
      title={t('SECURITY.DISABLE_TITLE')}
      description={t('SECURITY.DISABLE_DESC')}
      footer={
        <>
          <Button variant="ghost" onPress={close} disabled={busy} testID="security-disable-cancel">
            {t('COMMON.CANCEL')}
          </Button>
          <Button variant="danger" loading={busy} onPress={disable} testID="security-disable-confirm">
            {t('SECURITY.DISABLE')}
          </Button>
        </>
      }
    >
      <View>
        <Input
          label={t('SECURITY.CODE_LABEL')}
          value={code}
          onChangeText={(v) => {
            setCode(sanitizeCode(v));
            setError(undefined);
          }}
          error={error}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          inputClassName="text-center text-xl tracking-[8px]"
          returnKeyType="go"
          onSubmitEditing={disable}
          testID="security-disable-code"
        />
      </View>
    </Modal>
  );
}
