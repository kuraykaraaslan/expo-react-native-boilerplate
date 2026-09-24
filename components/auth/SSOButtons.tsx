import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faApple, faGithub, faGoogle } from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Button, Separator } from '@/components/ui';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

type Provider = { key: string; label: string; icon: IconDefinition; brandColor?: string };

// Third-party brand marks keep their brand color (Google); monochrome marks follow the text token.
const PROVIDERS: Provider[] = [
  { key: 'google', label: 'Google', icon: faGoogle, brandColor: '#ea4335' },
  { key: 'apple', label: 'Apple', icon: faApple },
  { key: 'github', label: 'GitHub', icon: faGithub },
];

type SSOButtonsProps = {
  onPress: (provider: string, label: string) => void;
  /** Divider text under the buttons, e.g. "or continue with email". */
  dividerLabel: string;
};

/** next-boilerplate's OAuth block: full-width outline buttons, then a labelled divider. */
export function SSOButtons({ onPress, dividerLabel }: SSOButtonsProps) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();

  return (
    <View className="gap-3">
      {PROVIDERS.map((p) => (
        <Button
          key={p.key}
          variant="outline"
          fullWidth
          onPress={() => onPress(p.key, p.label)}
          iconLeft={<FontAwesomeIcon icon={p.icon} size={16} color={p.brandColor ?? tokens['text-primary']} />}
          accessibilityLabel={t('AUTH_UI.CONTINUE_WITH', { provider: p.label })}
          testID={`auth-sso-${p.key}`}
        >
          {t('AUTH_UI.CONTINUE_WITH', { provider: p.label })}
        </Button>
      ))}
      <Separator label={dividerLabel} className="my-1" />
    </View>
  );
}
