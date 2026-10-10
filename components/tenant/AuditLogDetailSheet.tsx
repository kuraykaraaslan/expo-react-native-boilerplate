import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Modal, Text } from '@/components/ui';
import type { AuditLog } from '@/services/compliance/compliance.dto';
import { formatDate } from '@/utils/format';

const SEVERITY_VARIANT = { low: 'neutral', medium: 'warning', high: 'error', critical: 'error' } as const;

function Field({ label, value, testID }: { label: string; value?: string | null; testID?: string }) {
  if (!value) return null;
  return (
    <View className="gap-0.5" testID={testID}>
      <Text className="text-xs text-text-secondary">{label}</Text>
      <Text className="text-sm text-text-primary" selectable>
        {value}
      </Text>
    </View>
  );
}

function metadataText(metadata: AuditLog['metadata']): string {
  if (!metadata || Object.keys(metadata).length === 0) return '';
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return '';
  }
}

type AuditLogDetailSheetProps = {
  entry: AuditLog | null;
  onClose: () => void;
};

/** Every field of one audit entry, including the actor id, IP address and metadata the list rows leave out. */
export function AuditLogDetailSheet({ entry, onClose }: AuditLogDetailSheetProps) {
  const { t } = useTranslation();
  const actor = entry ? (entry.actorType === 'SYSTEM' ? t('AUDIT.ACTOR_SYSTEM') : entry.actorType === 'API_KEY' ? t('AUDIT.ACTOR_API_KEY') : t('AUDIT.ACTOR_USER')) : '';
  const meta = entry ? metadataText(entry.metadata) : '';
  const when = entry ? `${formatDate(entry.createdAt)}  ${new Date(entry.createdAt).toLocaleTimeString()}` : '';

  return (
    <Modal
      open={entry !== null}
      onClose={onClose}
      title={t('AUDIT.DETAILS')}
      footer={
        <Button variant="ghost" onPress={onClose} testID="audit-detail-close">
          {t('COMMON.CLOSE')}
        </Button>
      }
    >
      {entry ? (
        <View className="gap-3" testID="audit-detail">
          <View className="flex-row items-center gap-2">
            <Text className="min-w-0 flex-1 text-base font-medium text-text-primary" selectable>
              {entry.action}
            </Text>
            <Badge variant={SEVERITY_VARIANT[entry.severity]} size="sm">
              {t(`AUDIT.SEV_${entry.severity}`)}
            </Badge>
          </View>
          <Field label={t('AUDIT.DETAIL_TIME')} value={when} />
          <Field label={t('AUDIT.DETAIL_ACTOR')} value={actor} />
          <Field label={t('AUDIT.DETAIL_ACTOR_ID')} value={entry.actorId} testID="audit-detail-actor-id" />
          <Field label={t('AUDIT.DETAIL_RESOURCE')} value={entry.resourceType} />
          <Field label={t('AUDIT.DETAIL_RESOURCE_ID')} value={entry.resourceId} />
          <Field label={t('AUDIT.DETAIL_IP')} value={entry.ipAddress} />
          <Field label={t('AUDIT.DETAIL_ENTRY_ID')} value={entry.auditLogId} />
          <View className="gap-0.5">
            <Text className="text-xs text-text-secondary">{t('AUDIT.DETAIL_METADATA')}</Text>
            {meta ? (
              <Text className="rounded-lg border border-border bg-surface-overlay px-3 py-2 font-mono text-xs text-text-primary" selectable testID="audit-detail-metadata">
                {meta}
              </Text>
            ) : (
              <Text className="text-sm text-text-disabled">{t('AUDIT.DETAIL_NO_METADATA')}</Text>
            )}
          </View>
        </View>
      ) : null}
    </Modal>
  );
}
