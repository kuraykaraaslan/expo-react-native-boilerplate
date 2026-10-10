import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal, Text } from '@/components/ui';
import { parseSuspendUntil } from '@/utils/suspendUntil';

type SuspendMemberModalProps = {
  /** Display name of the member being suspended; `null` keeps the modal closed. */
  name: string | null;
  onClose: () => void;
  /** Runs the suspension; the modal closes when it resolves and stays open when it throws. */
  onSubmit: (input: { reason?: string; until?: string }) => Promise<void>;
};

const REASON_MAX = 500;

/** Suspend form: optional reason (max 500) and optional end date (`YYYY-MM-DD`). */
export function SuspendMemberModal({ name, onClose, onSubmit }: SuspendMemberModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (name !== null) {
      setReason('');
      setUntil('');
      setError(undefined);
    }
  }, [name]);

  async function submit() {
    const parsed = parseSuspendUntil(until);
    if (!parsed.ok) {
      setError(t('MEMBERS.SUSPEND_UNTIL_INVALID'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ reason: reason.trim() || undefined, until: parsed.iso });
      onClose();
    } catch {
      // The caller reports the failure; keep the form so nothing typed is lost.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={name !== null}
      onClose={busy ? () => {} : onClose}
      title={t('MEMBERS.SUSPEND_TITLE')}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy} testID="members-suspend-cancel">
            {t('COMMON.CANCEL')}
          </Button>
          <Button variant="danger" onPress={submit} loading={busy} testID="members-suspend-confirm">
            {t('MEMBERS.SUSPEND')}
          </Button>
        </>
      }
    >
      <View className="gap-4">
        <Text className="text-sm text-text-secondary">{t('MEMBERS.SUSPEND_DESC', { email: name ?? '' })}</Text>
        <Input
          label={t('MEMBERS.SUSPEND_REASON')}
          value={reason}
          onChangeText={(v) => setReason(v.slice(0, REASON_MAX))}
          multiline
          testID="members-suspend-reason"
        />
        <Input
          label={t('MEMBERS.SUSPEND_UNTIL')}
          placeholder="YYYY-MM-DD"
          value={until}
          onChangeText={(v) => {
            setUntil(v);
            setError(undefined);
          }}
          error={error}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          testID="members-suspend-until"
        />
        <Text className="text-xs text-text-secondary">{t('MEMBERS.SUSPEND_UNTIL_HINT')}</Text>
      </View>
    </Modal>
  );
}
