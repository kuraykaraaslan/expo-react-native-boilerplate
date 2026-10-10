import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Button, Input, Modal } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { PasskeyRenameRequestSchema, type Passkey } from '@/services/auth/passkey.dto';
import { PasskeyClientService } from '@/services/auth/passkey.service.client';

type Props = { passkey: Passkey; onClose: () => void; onRenamed: () => void };

/** Renames a passkey (label only: 1 to 64 characters, the server's rule). */
export function PasskeyRenameModal({ passkey, onClose, onRenamed }: Readonly<Props>) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(passkey.label);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function save() {
    const parsed = PasskeyRenameRequestSchema.safeParse({ label });
    if (!parsed.success) {
      setError(t('PASSKEYS.NAME_INVALID'));
      return;
    }
    if (parsed.data.label === passkey.label) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await PasskeyClientService.rename(passkey.credentialId, parsed.data.label);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('PASSKEYS.RENAMED'));
      onClose();
      onRenamed();
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'PasskeyRenameModal.save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title={t('PASSKEYS.RENAME_TITLE')}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy} testID="passkey-rename-cancel">
            {t('COMMON.CANCEL')}
          </Button>
          <Button loading={busy} onPress={save} testID="passkey-rename-save">
            {t('COMMON.SAVE')}
          </Button>
        </>
      }
    >
      <Input
        label={t('PASSKEYS.NAME_LABEL')}
        value={label}
        onChangeText={(v) => {
          setLabel(v);
          setError(undefined);
        }}
        error={error}
        maxLength={64}
        returnKeyType="done"
        onSubmitEditing={save}
        testID="passkey-rename-input"
      />
    </Modal>
  );
}
