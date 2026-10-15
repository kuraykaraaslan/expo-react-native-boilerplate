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
import { ChangePasswordRequestSchema } from '@/modules/auth/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { logout } from '@/libs/logout';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/modules/auth/auth.service.client';
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
      if (f.currentPassword) errs.current = t('auth.ui.passwordRequired');
      if (f.newPassword) errs.next = t('auth.ui.passwordMin');
    }
    if (confirm !== next) errs.confirm = t('auth.ui.passwordMatch');
    if (current && current === next) errs.next = t('auth.ui.passwordSameAsCurrent');
    setErrors(errs);
    if (!result.success || errs.confirm || errs.next) return;

    setLoading(true);
    try {
      await AuthClientService.changePassword(result.data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('auth.ui.passwordChanged'));
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
      title={t('auth.ui.changePasswordTitle')}
      subtitle={t('auth.ui.changePasswordSubtitle')}
      icon={faKey}
      footer={<AuthFooterLink prompt={t('auth.ui.wrongAccount')} label={t('auth.ui.signOut')} onPress={() => void logout()} testID="auth-change-signout" />}
    >
      <AlertBanner variant="warning" message={t('auth.ui.changePasswordRequired')} />
      <View className="gap-3">
        <Input
          label={t('auth.ui.currentPassword')}
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
          label={t('auth.ui.newPassword')}
          type="password"
          required
          hint={t('auth.register.passwordHint')}
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
          onSubmitEditing={handleChange}
          prefixIcon={<FontAwesomeIcon icon={faLock} size={14} color={iconColor} />}
          testID="auth-change-confirm"
        />
      </View>
      <Button fullWidth loading={loading} onPress={handleChange} testID="auth-change-submit">
        {loading ? t('auth.ui.saving') : t('auth.ui.changePassword')}
      </Button>
    </AuthShell>
  );
}
