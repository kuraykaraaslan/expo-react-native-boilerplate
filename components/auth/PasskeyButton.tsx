import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui';
import { normalizeApiError } from '@/libs/apiError';
import { handleApiError } from '@/libs/errorUtils';
import { passkeysAvailable, signInWithPasskey, type PasskeyFailure, type PasskeySignInResult } from '@/libs/passkey';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

type SignedIn = Extract<PasskeySignInResult, { status: 'signed-in' }>;

type PasskeyButtonProps = {
  /** A valid e-mail narrows the sheet to that account's passkeys; undefined asks for any passkey on the device. */
  email?: string;
  /** Another sign-in is running (the password button): this one is disabled meanwhile. */
  disabled?: boolean;
  /** The pair is stored already (libs/session); route the user exactly as after a password login. */
  onSignedIn: (result: SignedIn) => Promise<void>;
};

const FAILURE_KEY: Record<PasskeyFailure, string> = {
  cancelled: 'AUTH_UI.PASSKEY_FAILED',
  'no-credentials': 'AUTH_UI.PASSKEY_NO_CREDENTIAL',
  'already-exists': 'AUTH_UI.PASSKEY_FAILED',
  misconfigured: 'AUTH_UI.PASSKEY_MISCONFIGURED',
  unsupported: 'AUTH_UI.PASSKEY_FAILED',
  failed: 'AUTH_UI.PASSKEY_FAILED',
};

/**
 * "Sign in with a passkey". Renders nothing when passkeys cannot work in this build (Expo Go, web, old OS, or no
 * relying-party domain configured), so the login screen is exactly the password one there.
 */
export function PasskeyButton({ email, disabled, onSignedIn }: Readonly<PasskeyButtonProps>) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [busy, setBusy] = useState(false);

  if (!passkeysAvailable()) return null;

  async function press() {
    setBusy(true);
    try {
      const result = await signInWithPasskey(email);
      if (result.status === 'signed-in') {
        await onSignedIn(result);
      } else if (result.status === 'failed') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.error(t(FAILURE_KEY[result.reason]));
      }
      // 'cancelled' (sheet dismissed) and 'stale' (organization changed meanwhile): say nothing.
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // A 404 with free text is the tenant ("Tenant not found or inactive"): retrying cannot help. A 404 that carries a
      // constant (PASSKEY_NOT_REGISTERED, USER_NOT_FOUND) is the passkey or the account, and has its own translation.
      const { statusCode, rawMessage } = normalizeApiError(err);
      if (statusCode === 404 && !/^[A-Z0-9_]+$/.test(rawMessage ?? 'X')) {
        toast.error(t('AUTH_UI.TENANT_UNAVAILABLE'));
        return;
      }
      handleApiError(err, 'PasskeyButton.press');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      fullWidth
      loading={busy}
      disabled={disabled || busy}
      onPress={() => void press()}
      iconLeft={<FontAwesomeIcon icon={faKey} size={16} color={tokens['text-primary']} />}
      accessibilityLabel={t('AUTH_UI.PASSKEY_SIGN_IN')}
      testID="auth-login-passkey"
    >
      {t('AUTH_UI.PASSKEY_SIGN_IN')}
    </Button>
  );
}
