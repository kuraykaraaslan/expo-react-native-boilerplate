import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Button, Checkbox, Input, Modal, Select, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import type { ApiKeyIssued, ScopeDefinition } from '@/services/platform/apiKey.dto';
import { ApiKeyClientService } from '@/services/platform/apiKey.service.client';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (issued: ApiKeyIssued) => void;
};

// What the server always understands, offered when the tenant defined no scopes of its own.
const FALLBACK_SCOPES: ScopeDefinition[] = [{ scope: 'read' }, { scope: 'write' }];
const EXPIRY_DAYS = { never: null, d30: 30, d90: 90, d365: 365 } as const;
type Expiry = keyof typeof EXPIRY_DAYS;

/** Name, scopes (from the tenant's scope definitions) and an optional expiry. */
export function CreateApiKeyModal({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [definitions, setDefinitions] = useState<ScopeDefinition[]>(FALLBACK_SCOPES);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiry, setExpiry] = useState<Expiry>('never');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setScopes([]);
    setExpiry('never');
    setError(undefined);
    ApiKeyClientService.getScopeDefinitions()
      .then((defs) => setDefinitions(defs.length > 0 ? defs : FALLBACK_SCOPES))
      .catch(() => setDefinitions(FALLBACK_SCOPES)); // the form still works with the basic scopes
  }, [open]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError(t('API_KEYS.NAME_INVALID'));
    if (scopes.length === 0) return setError(t('API_KEYS.SCOPES_REQUIRED'));
    setError(undefined);
    setSaving(true);
    try {
      const days = EXPIRY_DAYS[expiry];
      const issued = await ApiKeyClientService.create({
        name: trimmed,
        scopes,
        expiresAt: days ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCreated(issued);
      onClose();
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'CreateApiKeyModal.submit');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={t('API_KEYS.NEW')}
      scrollable
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={saving}>
            {t('COMMON.CANCEL')}
          </Button>
          <Button loading={saving} onPress={submit} testID="api-keys-create">
            {t('API_KEYS.CREATE')}
          </Button>
        </>
      }
    >
      <View className="gap-4">
        <Input label={t('API_KEYS.NAME')} required value={name} onChangeText={setName} maxLength={100} testID="api-keys-name" />
        <View className="gap-2">
          {definitions.map((d) => (
            <Checkbox
              key={d.scope}
              label={d.label ?? d.scope}
              hint={d.description ?? (d.label ? d.scope : undefined)}
              checked={scopes.includes(d.scope)}
              onChange={(on) => setScopes((s) => (on ? [...s, d.scope] : s.filter((x) => x !== d.scope)))}
            />
          ))}
        </View>
        <Select
          id="api-key-expiry"
          label={t('API_KEYS.EXPIRES')}
          value={expiry}
          onChange={(v) => setExpiry(v as Expiry)}
          options={[
            { value: 'never', label: t('API_KEYS.EXP_NEVER') },
            { value: 'd30', label: t('API_KEYS.EXP_30') },
            { value: 'd90', label: t('API_KEYS.EXP_90') },
            { value: 'd365', label: t('API_KEYS.EXP_365') },
          ]}
        />
        {error ? <Text className="text-xs text-error">{error}</Text> : null}
      </View>
    </Modal>
  );
}
