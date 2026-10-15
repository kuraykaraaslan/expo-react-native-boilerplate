import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faLock, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { SSOButtons } from '@/components/auth/SSOButtons';
import { Button, Input } from '@/components/ui';
import { RegisterRequestSchema } from '@/modules/auth/auth.dto';
import { CONSENT_VERSION } from '@/constants/legal';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/modules/auth/auth.service.client';

type FieldErrors = { email?: string; password?: string; confirm?: string };

export default function RegisterScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const iconColor = tokens['text-disabled'];

  async function handleRegister() {
    const result = RegisterRequestSchema.safeParse({ email: email.trim(), password, consentVersion: CONSENT_VERSION });
    const next: FieldErrors = {};
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      if (errs.email) next.email = t('auth.ui.emailInvalid');
      if (errs.password) next.password = t('auth.ui.passwordMin');
    }
    if (confirm !== password) next.confirm = t('auth.ui.passwordMatch');
    setErrors(next);
    if (!result.success || next.confirm) return;

    setLoading(true);
    try {
      await AuthClientService.register(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('auth.common.registerSuccess'));
      router.replace('/login');
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'RegisterScreen.register');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('auth.ui.registerTitle')}
      subtitle={t('auth.ui.registerSubtitle')}
      icon={faUserPlus}
      footer={<AuthFooterLink prompt={t('auth.register.haveAccountPrompt')} label={t('auth.ui.signInLink')} href="/login" testID="auth-register-login" />}
    >
      <SSOButtons
        dividerLabel={t('auth.register.orWithEmail')}
      />

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
          testID="auth-register-email"
        />
        <Input
          label={t('auth.ui.password')}
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
          testID="auth-register-password"
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
          onSubmitEditing={handleRegister}
          prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={iconColor} />}
          testID="auth-register-confirm"
        />
      </View>

      <Button fullWidth loading={loading} onPress={handleRegister} testID="auth-register-submit">
        {loading ? t('auth.ui.creatingAccount') : t('auth.ui.createAccount')}
      </Button>
    </AuthShell>
  );
}
