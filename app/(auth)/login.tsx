import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { SSOButtons } from '@/components/auth/SSOButtons';
import { Button, Checkbox, Input, Text } from '@/components/ui';
import { LoginRequestSchema } from '@/services/auth/auth.dto';
import { getDeviceInfo } from '@/libs/deviceInfo';
import { normalizeApiError } from '@/libs/apiError';
import { handleApiError } from '@/libs/errorUtils';
import { startDeviceSession } from '@/libs/session';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth/auth.service.client';

type FieldErrors = { email?: string; password?: string };

export default function LoginScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleLogin() {
    const result = LoginRequestSchema.safeParse({ email: email.trim(), password });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      setErrors({
        email: errs.email ? t('AUTH_UI.EMAIL_INVALID') : undefined,
        password: errs.password ? t('AUTH_UI.PASSWORD_REQUIRED') : undefined,
      });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const login = await AuthClientService.deviceLogin({ ...result.data, rememberMe: remember, device: getDeviceInfo() });
      const { otpRequired, mustChangePassword } = await startDeviceSession(login);
      if (otpRequired) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/2fa');
        return;
      }
      if (mustChangePassword) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace('/change-password');
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (login.passwordExpiresInDays != null) {
        toast.warning(t('AUTH_UI.PASSWORD_EXPIRES_SOON', { count: login.passwordExpiresInDays }));
      }
      // The (auth) layout guard now sees a signed-in user and routes to the app.
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const { statusCode } = normalizeApiError(err);
      // The tenant is gone or inactive: pick another organization instead of retrying.
      if (statusCode === 404) {
        toast.error(t('AUTH_UI.TENANT_UNAVAILABLE'));
        router.push('/select-tenant');
        return;
      }
      handleApiError(err, 'LoginScreen.login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('AUTH_UI.LOGIN_TITLE')}
      subtitle={t('AUTH_UI.LOGIN_SUBTITLE')}
      footer={<AuthFooterLink prompt={t('AUTH_UI.NO_ACCOUNT')} label={t('AUTH_UI.SIGN_UP')} href="/register" testID="auth-login-register" />}
    >
      {/* SSO wiring arrives with phase 6 (server change K4). */}
      <SSOButtons
        dividerLabel={t('AUTH_UI.OR_CONTINUE_EMAIL')}
        onPress={(_, label) => toast.info(t('AUTH_UI.SSO_UNAVAILABLE', { provider: label }))}
      />

      <View className="gap-3">
        <Input
          label={t('AUTH_UI.EMAIL')}
          type="email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setErrors((e) => ({ ...e, email: undefined }));
          }}
          error={errors.email}
          autoComplete="email"
          textContentType="emailAddress"
          prefixIcon={<FontAwesomeIcon icon={faEnvelope} size={14} color={tokens['text-disabled']} />}
          testID="auth-login-email"
        />
        <Input
          label={t('AUTH_UI.PASSWORD')}
          type="password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={tokens['text-disabled']} />}
          testID="auth-login-password"
        />
        <Checkbox checked={remember} onChange={setRemember} label={t('AUTH_UI.REMEMBER_ME')} />
      </View>

      <View className="gap-4">
        <Button fullWidth loading={loading} onPress={handleLogin} testID="auth-login-submit">
          {loading ? t('AUTH_UI.SIGNING_IN') : t('AUTH_UI.SIGN_IN')}
        </Button>
        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="link" hitSlop={8} className="self-center" testID="auth-login-forgot">
            <Text className="text-xs font-medium text-primary">{t('AUTH_UI.FORGOT_PASSWORD')}</Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}
