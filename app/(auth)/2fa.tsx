import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCommentSms, faEnvelope, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Input, RadioGroup } from '@/components/ui';
import type { OTPMethod } from '@/services/auth/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { useAuthStore } from '@/stores/authStore';

// next-boilerplate has no OTP page; this follows the same auth card pattern.
export default function TwoFactorScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [method, setMethod] = useState<OTPMethod>('EMAIL');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const methodLabel = method === 'EMAIL' ? t('AUTH_UI.OTP_EMAIL') : t('AUTH_UI.OTP_SMS');

  async function handleSend() {
    setLoading(true);
    try {
      await AuthClientService.sendOTP(method);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toast.success(t('AUTH_UI.CODE_SENT', { method: methodLabel }));
      setSent(true);
    } catch (err: unknown) {
      handleApiError(err, 'TwoFactorScreen.send');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!/^\d{6}$/.test(code)) {
      setCodeError(t('AUTH_UI.OTP_CODE_INVALID'));
      return;
    }
    setCodeError(undefined);
    setLoading(true);
    try {
      const user = await AuthClientService.verifyOTP(code, method);
      setUser(user);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/select-tenant');
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'TwoFactorScreen.verify');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('AUTH_UI.OTP_TITLE')}
      subtitle={t('AUTH_UI.OTP_SUBTITLE')}
      icon={faShieldHalved}
      footer={<AuthFooterLink label={t('AUTH_UI.BACK_TO_SIGN_IN')} href="/login" testID="auth-2fa-login" />}
    >
      <RadioGroup
        name="otp-method"
        legend={t('AUTH_UI.OTP_METHOD')}
        variant="card"
        columns={2}
        value={method}
        onChange={(v) => {
          setMethod(v as OTPMethod);
          setSent(false);
        }}
        options={[
          {
            value: 'EMAIL',
            label: t('AUTH_UI.OTP_EMAIL'),
            hint: t('AUTH_UI.OTP_EMAIL_HINT'),
            icon: <FontAwesomeIcon icon={faEnvelope} size={16} color={tokens.primary} />,
          },
          {
            value: 'SMS',
            label: t('AUTH_UI.OTP_SMS'),
            hint: t('AUTH_UI.OTP_SMS_HINT'),
            icon: <FontAwesomeIcon icon={faCommentSms} size={16} color={tokens.primary} />,
          },
        ]}
      />

      {sent ? (
        <View className="gap-4">
          <Input
            label={t('AUTH_UI.OTP_CODE')}
            hint={t('AUTH_UI.OTP_CODE_HINT', { method: methodLabel })}
            value={code}
            onChangeText={(v) => {
              setCode(v.replace(/\D/g, '').slice(0, 6));
              setCodeError(undefined);
            }}
            error={codeError}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            inputClassName="text-center text-xl tracking-[8px]"
            returnKeyType="go"
            onSubmitEditing={handleVerify}
            testID="auth-2fa-code"
          />
          <Button fullWidth loading={loading} onPress={handleVerify} testID="auth-2fa-verify">
            {loading ? t('AUTH_UI.VERIFYING') : t('AUTH_UI.VERIFY')}
          </Button>
          <Button variant="ghost" fullWidth onPress={handleSend} disabled={loading} testID="auth-2fa-resend">
            {t('AUTH_UI.RESEND_CODE')}
          </Button>
        </View>
      ) : (
        <Button fullWidth loading={loading} onPress={handleSend} testID="auth-2fa-send">
          {loading ? t('AUTH_UI.SENDING') : t('AUTH_UI.SEND_CODE')}
        </Button>
      )}
    </AuthShell>
  );
}
