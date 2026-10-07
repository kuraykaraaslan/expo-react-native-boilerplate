import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faKey, faLock } from '@fortawesome/free-solid-svg-icons';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AlertBanner, Button, Input } from '@/components/ui';
import { ChangePasswordRequestSchema } from '@/services/auth/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { logout } from '@/libs/logout';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { useAuthStore } from '@/stores/authStore';

type FieldErrors = { current?: string; next?: string; confirm?: string };

/**
 * Forced password change: the (drawer) layout sends a signed-in user here while
 * the server's `mustChangePassword` is set. Nothing else is reachable until the
 * change succeeds; the only way out is signing out.
 */
export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const clearPasswordChange = useAuthStore((s) => s.clearPasswordChange);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const iconColor = tokens['text-disabled'];

  async function handleChange() {
    const result = ChangePasswordRequestSchema.safeParse({ currentPassword: current, newPassword: next });
    const errs: FieldErrors = {};
    if (!result.success) {
      const f = result.error.flatten().fieldErrors;
      if (f.currentPassword) errs.current = t('AUTH_UI.PASSWORD_REQUIRED');
      if (f.newPassword) errs.next = t('AUTH_UI.PASSWORD_MIN');
    }
    if (confirm !== next) errs.confirm = t('AUTH_UI.PASSWORD_MATCH');
    if (current && current === next) errs.next = t('AUTH_UI.PASSWORD_SAME_AS_CURRENT');
    setErrors(errs);
    if (!result.success || errs.confirm || errs.next) return;

    setLoading(true);
    try {
      await AuthClientService.changePassword(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('AUTH_UI.PASSWORD_CHANGED'));
      // The server kept this session and dropped the others; the guards route onward.
      clearPasswordChange();
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'ChangePasswordScreen.change');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('AUTH_UI.CHANGE_PASSWORD_TITLE')}
      subtitle={t('AUTH_UI.CHANGE_PASSWORD_SUBTITLE')}
      icon={faKey}
      footer={<AuthFooterLink prompt={t('AUTH_UI.WRONG_ACCOUNT')} label={t('AUTH_UI.SIGN_OUT')} onPress={() => void logout()} testID="auth-change-signout" />}
    >
      <AlertBanner variant="warning" message={t('AUTH_UI.CHANGE_PASSWORD_REQUIRED')} />
      <View className="gap-3">
        <Input
          label={t('AUTH_UI.CURRENT_PASSWORD')}
          type="password"
          required
          value={current}
          onChangeText={(v) => {
            setCurrent(v);
            setErrors((e) => ({ ...e, current: undefined }));
          }}
          error={errors.current}
          autoComplete="current-password"
          textContentType="password"
          prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={iconColor} />}
          testID="auth-change-current"
        />
        <Input
          label={t('AUTH_UI.NEW_PASSWORD')}
          type="password"
          required
          hint={t('AUTH_UI.PASSWORD_HINT')}
          value={next}
          onChangeText={(v) => {
            setNext(v);
            setErrors((e) => ({ ...e, next: undefined }));
          }}
          error={errors.next}
          autoComplete="new-password"
          textContentType="newPassword"
          prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={iconColor} />}
          testID="auth-change-new"
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
          onSubmitEditing={handleChange}
          prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={iconColor} />}
          testID="auth-change-confirm"
        />
      </View>
      <Button fullWidth loading={loading} onPress={handleChange} testID="auth-change-submit">
        {loading ? t('AUTH_UI.SAVING') : t('AUTH_UI.CHANGE_PASSWORD')}
      </Button>
    </AuthShell>
  );
}
