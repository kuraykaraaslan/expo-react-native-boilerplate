import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuilding, faLock } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Input } from '@/components/ui';
import { getDeviceInfo } from '@/libs/deviceInfo';
import { handleApiError } from '@/libs/errorUtils';
import { startDeviceSession } from '@/libs/session';
import { activateSignedInTenant } from '@/libs/tenantSwitch';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { useAuthStore } from '@/stores/authStore';

/**
 * Signs the current user in to another organization (K2: one token pair per
 * tenant). Only the password is asked; the e-mail is the signed-in account's.
 */
export default function TenantLoginScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const { tenantId, name } = useLocalSearchParams<{ tenantId?: string; name?: string }>();
  const email = useAuthStore((s) => s.user?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const orgName = name || t('AUTH_UI.THIS_ORG');

  async function handleLogin() {
    if (!tenantId) return;
    if (!password) {
      setError(t('AUTH_UI.PASSWORD_REQUIRED'));
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const login = await AuthClientService.deviceLogin({ email, password, rememberMe: true, device: getDeviceInfo() }, tenantId);
      const { otpRequired, mustChangePassword } = await startDeviceSession(login);
      if (otpRequired || mustChangePassword) return; // the layout guards take it from here
      await activateSignedInTenant(tenantId, login.tenantMember.memberRole);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'TenantLoginScreen.login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('AUTH_UI.TENANT_LOGIN_TITLE', { name: orgName })}
      subtitle={t('AUTH_UI.TENANT_LOGIN_SUBTITLE', { email })}
      icon={faBuilding}
      footer={<AuthFooterLink label={t('AUTH_UI.BACK_TO_ORGS')} href="/select-tenant" testID="auth-tenant-login-back" />}
    >
      <Input
        label={t('AUTH_UI.PASSWORD')}
        type="password"
        required
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setError(undefined);
        }}
        error={error}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
        prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={tokens['text-disabled']} />}
        testID="auth-tenant-login-password"
      />
      <Button fullWidth loading={loading} onPress={handleLogin} testID="auth-tenant-login-submit">
        {loading ? t('AUTH_UI.SIGNING_IN') : t('AUTH_UI.SIGN_IN')}
      </Button>
    </AuthShell>
  );
}
