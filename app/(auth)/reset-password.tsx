import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faKey, faLock } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Input } from '@/components/ui';
import { ResetPasswordRequestSchema } from '@/services/auth/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth/auth.service.client';

type FieldErrors = { email?: string; token?: string; password?: string; confirm?: string };

/**
 * Finishes a password reset. The e-mail carries a web link; until the app has a
 * deep-link scheme (phase 6) the user pastes the token. `email` and
 * `resetToken` query params prefill the fields when a link does reach the app.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const params = useLocalSearchParams<{ email?: string; resetToken?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [token, setToken] = useState(params.resetToken ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const iconColor = tokens['text-disabled'];

  async function handleReset() {
    const result = ResetPasswordRequestSchema.safeParse({ email: email.trim(), resetToken: token.trim(), password });
    const errs: FieldErrors = {};
    if (!result.success) {
      const f = result.error.flatten().fieldErrors;
      if (f.email) errs.email = t('AUTH_UI.EMAIL_INVALID');
      if (f.resetToken) errs.token = t('AUTH_UI.RESET_TOKEN_REQUIRED');
      if (f.password) errs.password = t('AUTH_UI.PASSWORD_MIN');
    }
    if (confirm !== password) errs.confirm = t('AUTH_UI.PASSWORD_MATCH');
    setErrors(errs);
    if (!result.success || errs.confirm) return;

    setLoading(true);
    try {
      await AuthClientService.resetPassword(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('AUTH_UI.PASSWORD_RESET_DONE'));
      router.replace('/login');
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'ResetPasswordScreen.reset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('AUTH_UI.RESET_TITLE')}
      subtitle={t('AUTH_UI.RESET_SUBTITLE')}
      icon={faKey}
      footer={<AuthFooterLink prompt={t('AUTH_UI.REMEMBER_PASSWORD')} label={t('AUTH_UI.SIGN_IN_LINK')} href="/login" testID="auth-reset-login" />}
    >
      <View className="gap-3">
        <Input
          label={t('AUTH_UI.EMAIL')}
          type="email"
          required
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setErrors((e) => ({ ...e, email: undefined }));
          }}
          error={errors.email}
          autoComplete="email"
          textContentType="emailAddress"
          prefixIcon={<FontAwesomeIcon icon={faEnvelope} size={14} color={iconColor} />}
          testID="auth-reset-email"
        />
        <Input
          label={t('AUTH_UI.RESET_TOKEN')}
          required
          value={token}
          onChangeText={(v) => {
            setToken(v);
            setErrors((e) => ({ ...e, token: undefined }));
          }}
          error={errors.token}
          autoCapitalize="none"
          autoCorrect={false}
          prefixIcon={<FontAwesomeIcon icon={faKey} size={14} color={iconColor} />}
          testID="auth-reset-token"
        />
        <Input
          label={t('AUTH_UI.NEW_PASSWORD')}
          type="password"
          required
          hint={t('AUTH_UI.PASSWORD_HINT')}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          autoComplete="new-password"
          textContentType="newPassword"
          prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={iconColor} />}
          testID="auth-reset-password"
        />
        <Input
          label={t('AUTH_UI.CONFIRM_PASSWORD')}
          type="password"
          required
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            setErrors((e) => ({ ...e, confirm: undefined }));
          }}
          error={errors.confirm}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleReset}
          prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={iconColor} />}
          testID="auth-reset-confirm"
        />
      </View>
      <Button fullWidth loading={loading} onPress={handleReset} testID="auth-reset-submit">
        {loading ? t('AUTH_UI.SAVING') : t('AUTH_UI.RESET_PASSWORD')}
      </Button>
    </AuthShell>
  );
}
