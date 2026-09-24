import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faLock, faUser, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { SSOButtons } from '@/components/auth/SSOButtons';
import { Button, Input } from '@/components/ui';
import { RegisterRequestSchema } from '@/dto/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth.service.client';

type FieldErrors = { email?: string; password?: string; confirm?: string };

export default function RegisterScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const iconColor = tokens['text-disabled'];

  async function handleRegister() {
    const result = RegisterRequestSchema.safeParse({ email: email.trim(), password, name: name.trim() || undefined });
    const next: FieldErrors = {};
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      if (errs.email) next.email = t('AUTH_UI.EMAIL_INVALID');
      if (errs.password) next.password = t('AUTH_UI.PASSWORD_MIN');
    }
    if (confirm !== password) next.confirm = t('AUTH_UI.PASSWORD_MATCH');
    setErrors(next);
    if (!result.success || next.confirm) return;

    setLoading(true);
    try {
      await AuthClientService.register(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('AUTH.REGISTER_SUCCESS'));
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
      title={t('AUTH_UI.REGISTER_TITLE')}
      subtitle={t('AUTH_UI.REGISTER_SUBTITLE')}
      icon={faUserPlus}
      footer={<AuthFooterLink prompt={t('AUTH_UI.HAVE_ACCOUNT')} label={t('AUTH_UI.SIGN_IN_LINK')} href="/login" testID="auth-register-login" />}
    >
      <SSOButtons
        dividerLabel={t('AUTH_UI.OR_REGISTER_EMAIL')}
        onPress={(_, label) => toast.info(t('AUTH_UI.SSO_UNAVAILABLE', { provider: label }))}
      />

      <View className="gap-3">
        <Input
          label={t('AUTH_UI.FULL_NAME')}
          hint={t('COMMON.OPTIONAL')}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          prefixIcon={<FontAwesomeIcon icon={faUser} size={14} color={iconColor} />}
          testID="auth-register-name"
        />
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
          testID="auth-register-email"
        />
        <Input
          label={t('AUTH_UI.PASSWORD')}
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
          testID="auth-register-password"
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
          onSubmitEditing={handleRegister}
          prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={iconColor} />}
          testID="auth-register-confirm"
        />
      </View>

      <Button fullWidth loading={loading} onPress={handleRegister} testID="auth-register-submit">
        {loading ? t('AUTH_UI.CREATING_ACCOUNT') : t('AUTH_UI.CREATE_ACCOUNT')}
      </Button>
    </AuthShell>
  );
}
