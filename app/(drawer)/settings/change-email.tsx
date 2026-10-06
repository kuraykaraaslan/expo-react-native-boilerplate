import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Button, Card, Input } from '@/components/ui';
import { ChangeEmailRequestSchema } from '@/services/auth/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { useAuthStore } from '@/stores/authStore';

export default function ChangeEmailScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const current = useAuthStore((s) => s.user?.email);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function submit() {
    const result = ChangeEmailRequestSchema.safeParse({ newEmail: email.trim() });
    if (!result.success) {
      setError(t('AUTH_UI.EMAIL_INVALID'));
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await AuthClientService.changeEmail(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('EMAIL_CHANGE.SENT'));
      setEmail('');
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'ChangeEmailScreen.submit');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen keyboard>
      <ScreenHeader back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }} title={t('EMAIL_CHANGE.TITLE')} subtitle={t('EMAIL_CHANGE.SUBTITLE')} />
      <Card
        title={t('EMAIL_CHANGE.CARD')}
        subtitle={current ? t('EMAIL_CHANGE.CARD_DESC', { email: current }) : undefined}
        footer={
          <View className="flex-row justify-end">
            <Button loading={saving} onPress={submit} testID="account-email-submit">
              {saving ? t('COMMON.SAVING') : t('EMAIL_CHANGE.SUBMIT')}
            </Button>
          </View>
        }
      >
        <Input
          label={t('EMAIL_CHANGE.NEW_EMAIL')}
          hint={t('EMAIL_CHANGE.NEW_EMAIL_HINT')}
          type="email"
          required
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(undefined);
          }}
          error={error}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
          prefixIcon={<FontAwesomeIcon icon={faEnvelope} size={14} color={tokens['text-disabled']} />}
          testID="account-email-input"
        />
      </Card>
    </Screen>
  );
}
