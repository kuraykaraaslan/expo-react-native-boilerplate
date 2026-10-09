import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Button, Input, Modal, Select } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { REPORT_REASONS, type Message, type ReportReason } from '@/services/platform/messaging.dto';
import { MessagingClientService } from '@/services/platform/messaging.service.client';

type Props = { message: Message | null; onClose: () => void; onReported: () => void };

/** Report a message to the organization's moderators. The server decides what happens next. */
export function ReportMessageModal({ message, onClose, onReported }: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (message) {
      setReason('spam');
      setNote('');
    }
  }, [message]);

  async function submit() {
    if (!message) return;
    setSending(true);
    try {
      await MessagingClientService.reportMessage(message.conversationId, message.messageId, reason, note.trim() || undefined);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onReported();
    } catch (err: unknown) {
      handleApiError(err, 'ReportMessageModal.submit');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={message !== null}
      onClose={sending ? () => {} : onClose}
      title={t('MESSAGES.REPORT_TITLE')}
      description={t('MESSAGES.REPORT_DESC')}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={sending}>
            {t('COMMON.CANCEL')}
          </Button>
          <Button variant="danger" loading={sending} onPress={submit} testID="messages-report-submit">
            {t('MESSAGES.REPORT')}
          </Button>
        </>
      }
    >
      <View className="gap-3">
        <Select
          id="report-reason"
          label={t('MESSAGES.REPORT_REASON')}
          value={reason}
          onChange={(v) => setReason(v as ReportReason)}
          options={REPORT_REASONS.map((r) => ({ value: r, label: t(`MESSAGES.REASON_${r.toUpperCase()}`) }))}
        />
        <Input label={t('MESSAGES.REPORT_NOTE')} value={note} onChangeText={setNote} maxLength={500} multiline testID="messages-report-note" />
      </View>
    </Modal>
  );
}
