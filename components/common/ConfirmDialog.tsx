import { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@/components/ui';

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Verb + object, e.g. "Remove member". */
  title: string;
  /** The consequence, e.g. "x will lose access". */
  description: string;
  /** Echoes the verb, e.g. "Remove". */
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
};

/**
 * Destructive-action confirmation (UI_Interface_Rules_Common/overlays):
 * Cancel on the left, danger confirm on the right, busy while running.
 */
export function ConfirmDialog({ open, onClose, title, description, confirmLabel, onConfirm }: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy} testID="confirm-dialog-cancel">
            {t('COMMON.CANCEL')}
          </Button>
          <Button variant="danger" onPress={confirm} loading={busy} testID="confirm-dialog-confirm">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Text className="text-sm text-text-secondary">{description}</Text>
    </Modal>
  );
}
