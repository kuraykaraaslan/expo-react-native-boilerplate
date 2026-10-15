import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCommentSms, faEnvelope, faMobileScreen, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Input, RadioGroup } from '@/components/ui';
import type { OTPMethod } from '@/modules/auth/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useCountdown } from '@/libs/useCountdown';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/modules/auth/auth.service.client';
import { useAuthStore } from '@/stores/authStore';

const RESEND_SECONDS = 30;
const OTP_HINT_KEYS = { EMAIL: 'auth.ui.otpEmailHint', SMS: 'auth.ui.otpSmsHint', TOTP_APP: 'auth.ui.otpTotpHint' } as const;
const OTP_ICONS = { EMAIL: faEnvelope, SMS: faCommentSms, TOTP_APP: faMobileScreen } as const;
const OTP_LABEL_KEYS = { EMAIL: 'auth.ui.otpEmail', SMS: 'auth.ui.otpSms', TOTP_APP: 'auth.ui.otpTotp' } as const;
// Unknown enrolment (the gate was hit on a restored session): offer the channels the server can deliver.
const FALLBACK_METHODS: OTPMethod[] = ['EMAIL', 'SMS'];

// next-boilerplate has no OTP page; this follows the same auth card pattern.
export default function TwoFactorScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const enrolled = useAuthStore((s) => s.otpMethods);
  const methods = enrolled.length > 0 ? enrolled : FALLBACK_METHODS;
  const [method, setMethod] = useState<OTPMethod>(methods[0]);
  const { remaining, start: startCountdown } = useCountdown();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  // An authenticator app needs no delivery step: its code is already on the phone.
  const [sent, setSent] = useState(methods[0] === 'TOTP_APP');
  const [loading, setLoading] = useState(false);
  const clearOtp = useAuthStore((s) => s.clearOtp);
  const methodLabel = t(OTP_LABEL_KEYS[method]);

  async function handleSend() {
    setLoading(true);
    try {
      await AuthClientService.sendOTP(method, 'authenticate');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toast.success(t('auth.ui.codeSent', { method: methodLabel }));
      setSent(true);
      startCountdown(RESEND_SECONDS);
    } catch (err: unknown) {
      handleApiError(err, 'TwoFactorScreen.send');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!/^\d{6}$/.test(code)) {
      setCodeError(t('auth.ui.otpCodeInvalid'));
      return;
    }
    setCodeError(undefined);
    setLoading(true);
    try {
      await AuthClientService.verifyOTP(method, 'authenticate', code);
      // The reply carries no user — the session is the same; its OTP gate is open now.
      await AuthClientService.getSession();
      clearOtp();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'TwoFactorScreen.verify');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={t('auth.ui.otpTitle')}
      subtitle={t('auth.ui.otpSubtitle')}
      icon={faShieldHalved}
      footer={<AuthFooterLink label={t('auth.callback.backToSignIn')} href="/login" testID="auth-2fa-login" />}
    >
      {methods.length > 1 ? (
        <RadioGroup
          name="otp-method"
          legend={t('auth.ui.otpMethod')}
          variant="card"
          columns={1}
          value={method}
          onChange={(v) => {
            const next = v as OTPMethod;
            setMethod(next);
            setCode('');
            setCodeError(undefined);
            setSent(next === 'TOTP_APP');
          }}
          options={methods.map((m) => ({
            value: m,
            label: t(OTP_LABEL_KEYS[m]),
            hint: t(OTP_HINT_KEYS[m]),
            icon: <FontAwesomeIcon icon={OTP_ICONS[m]} size={16} color={tokens.primary} />,
          }))}
        />
      ) : null}

      {sent ? (
        <View className="gap-4">
          <Input
            label={t('auth.ui.otpCode')}
            hint={method === 'TOTP_APP' ? t('auth.ui.otpTotpCodeHint') : t('auth.ui.otpCodeHint', { method: methodLabel })}
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
            {loading ? t('auth.ui.verifying') : t('auth.ui.verify')}
          </Button>
          {method !== 'TOTP_APP' ? (
            <Button variant="ghost" fullWidth onPress={handleSend} disabled={loading || remaining > 0} testID="auth-2fa-resend">
              {remaining > 0 ? t('auth.ui.resendIn', { time: remaining }) : t('auth.ui.resendCode')}
            </Button>
          ) : null}
        </View>
      ) : (
        <Button fullWidth loading={loading} onPress={handleSend} testID="auth-2fa-send">
          {loading ? t('auth.ui.sending') : t('auth.ui.sendCode')}
        </Button>
      )}
    </AuthShell>
  );
}
