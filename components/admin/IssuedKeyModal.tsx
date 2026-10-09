import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Button, Modal, Text } from '@/components/ui';

type Props = {
  /** The plaintext key, or null when nothing was issued. Lives in the caller's state only. */
  rawKey: string | null;
  /** Called when the user confirms they saved it; the caller must drop the key. */
  onDone: () => void;
};

/**
 * Shows a freshly issued API key exactly once. No backdrop dismiss and no persistence:
 * the only exit is "I've saved it", after which the caller clears the key from memory.
 * Copying is an explicit tap, never automatic.
 */
export function IssuedKeyModal({ rawKey, onDone }: Props) {
  const { t } = useTranslation();

  async function copy() {
    if (!rawKey) return;
    await Clipboard.setStringAsync(rawKey);
    await Haptics.selectionAsync();
    toast.success(t('API_KEYS.COPIED'));
  }

  return (
    <Modal
      open={rawKey !== null}
      onClose={() => {}}
      closeOnBackdropClick={false}
      title={t('API_KEYS.ISSUED_TITLE')}
      description={t('API_KEYS.ISSUED_DESC')}
      footer={
        <>
          <Button variant="outline" onPress={copy} testID="api-keys-copy">
            {t('API_KEYS.COPY')}
          </Button>
          <Button onPress={onDone} testID="api-keys-saved">
            {t('API_KEYS.SAVED')}
          </Button>
        </>
      }
    >
      <View className="rounded-lg border border-border bg-surface-sunken p-3">
        <Text selectable className="font-mono text-xs text-text-primary" testID="api-keys-raw">
          {rawKey}
        </Text>
      </View>
    </Modal>
  );
}
