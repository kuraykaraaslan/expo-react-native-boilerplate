import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useTheme, useThemeTokens } from '@/libs/theme/ThemeContext';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { isDark, setColorScheme } = useTheme();
  const tokens = useThemeTokens();

  return (
    <Pressable
      onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
      accessibilityRole="button"
      accessibilityLabel={isDark ? t('SHELL.THEME_TO_LIGHT') : t('SHELL.THEME_TO_DARK')}
      testID="shell-theme-toggle"
      className="h-9 w-9 items-center justify-center rounded-md active:bg-surface-overlay"
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} color={tokens['text-secondary']} size={16} />
    </Pressable>
  );
}
