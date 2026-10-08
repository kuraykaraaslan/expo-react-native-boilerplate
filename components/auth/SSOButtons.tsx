import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Button, Separator } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import logger from '@/libs/logger';
import { signInWithProvider } from '@/libs/ssoSession';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import type { SSOProvider } from '@/services/auth/sso.dto';
import { SSOClientService } from '@/services/auth/sso.service.client';
import { SSO_PROVIDER_META } from './ssoProviders';

type SSOButtonsProps = {
  /** Divider text under the buttons, e.g. "or continue with email". */
  dividerLabel: string;
};

/**
 * next-boilerplate's OAuth block: full-width outline buttons, then a labelled
 * divider. The providers come from the server (what this tenant allows); with
 * none, or while loading or offline, nothing renders - not even the divider.
 */
export function SSOButtons({ dividerLabel }: Readonly<SSOButtonsProps>) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [busy, setBusy] = useState<SSOProvider | null>(null);

  useEffect(() => {
    let cancelled = false;
    SSOClientService.getProviders()
      .then((list) => !cancelled && setProviders(list))
      .catch((err: unknown) => logger.warn('SSO providers unavailable', err instanceof Error ? err.message : 'unknown'));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePress(provider: SSOProvider) {
    setBusy(provider);
    try {
      const outcome = await signInWithProvider(provider);
      if (outcome === 'signed-in') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // the (auth) guard routes into the app
      } else if (outcome === 'unavailable') {
        toast.error(t('AUTH_UI.SSO_FAILED'));
      } else if (outcome === 'state-mismatch') {
        toast.error(t('AUTH_UI.SSO_STATE_MISMATCH'));
      }
      // 'cancelled': the user closed the browser - say nothing.
    } catch (err: unknown) {
      handleApiError(err, 'SSOButtons.press');
    } finally {
      setBusy(null);
    }
  }

  if (providers.length === 0) return null;

  return (
    <View className="gap-3">
      {providers.map((provider) => {
        const meta = SSO_PROVIDER_META[provider];
        return (
          <Button
            key={provider}
            variant="outline"
            fullWidth
            loading={busy === provider}
            disabled={busy !== null}
            onPress={() => void handlePress(provider)}
            iconLeft={<FontAwesomeIcon icon={meta.icon} size={16} color={meta.brandColor ?? tokens['text-primary']} />}
            accessibilityLabel={t('AUTH_UI.CONTINUE_WITH', { provider: meta.label })}
            testID={`auth-sso-${provider}`}
          >
            {t('AUTH_UI.CONTINUE_WITH', { provider: meta.label })}
          </Button>
        );
      })}
      <Separator label={dividerLabel} className="my-1" />
    </View>
  );
}
