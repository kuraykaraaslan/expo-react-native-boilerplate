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
import { ResetPasswordRequestSchema } from '@/modules/auth/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/modules/auth/auth.service.client';

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
      if (f.email) errs.email = t('auth.ui.emailInvalid');
      if (f.resetToken) errs.token = t('auth.ui.resetTokenRequired');
      if (f.password) errs.password = t('auth.ui.passwordMin');
    }
    if (confirm !== password) errs.confirm = t('auth.ui.passwordMatch');
    setErrors(errs);
    if (!result.success || errs.confirm) return;

    setLoading(true);
    try {
      await AuthClientService.resetPassword(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('auth.ui.passwordResetDone'));
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
      title={t('auth.resetPassword.title')}
      subtitle={t('auth.ui.resetSubtitle')}
      icon={faKey}
      footer={<AuthFooterLink prompt={t('auth.forgotPassword.rememberPrompt')} label={t('auth.ui.signInLink')} href="/login" testID="auth-reset-login" />}
    >
      <View className="gap-3">
        <Input
          label={t('auth.ui.email')}
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
          label={t('auth.ui.resetToken')}
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
          label={t('auth.ui.newPassword')}
          type="password"
          required
          hint={t('auth.register.passwordHint')}
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
          label={t('auth.ui.confirmPassword')}
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
        {loading ? t('auth.ui.saving') : t('auth.ui.resetPassword')}
      </Button>
    </AuthShell>
  );
}
