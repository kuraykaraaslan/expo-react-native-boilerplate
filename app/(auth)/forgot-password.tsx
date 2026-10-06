import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faEnvelopeCircleCheck, faKey } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { AlertBanner, Button, Input } from '@/components/ui';
import { ForgotPasswordRequestSchema } from '@/services/auth/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth/auth.service.client';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSend() {
    const result = ForgotPasswordRequestSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setError(t('AUTH_UI.EMAIL_INVALID'));
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await AuthClientService.forgotPassword(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('AUTH.RESET_LINK_SENT'));
      setSentTo(result.data.email);
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'ForgotPasswordScreen.send');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('AUTH_UI.FORGOT_TITLE')}
      subtitle={t('AUTH_UI.FORGOT_SUBTITLE')}
      icon={sentTo ? faEnvelopeCircleCheck : faKey}
      footer={<AuthFooterLink prompt={t('AUTH_UI.REMEMBER_PASSWORD')} label={t('AUTH_UI.SIGN_IN_LINK')} href="/login" testID="auth-forgot-login" />}
    >
      {sentTo ? (
        <AlertBanner
          variant="success"
          title={t('AUTH_UI.CHECK_INBOX')}
          message={t('AUTH_UI.CHECK_INBOX_DESC', { email: sentTo })}
        />
      ) : (
        <View className="gap-4">
          <Input
            label={t('AUTH_UI.EMAIL')}
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
            onSubmitEditing={handleSend}
            prefixIcon={<FontAwesomeIcon icon={faEnvelope} size={14} color={tokens['text-disabled']} />}
            testID="auth-forgot-email"
          />
          <Button fullWidth loading={loading} onPress={handleSend} testID="auth-forgot-submit">
            {loading ? t('AUTH_UI.SENDING') : t('AUTH_UI.SEND_RESET_LINK')}
          </Button>
        </View>
      )}
    </AuthShell>
  );
}
