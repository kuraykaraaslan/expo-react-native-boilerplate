import { Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useTheme, useThemeTokens } from '@/libs/theme/ThemeContext';

export function ThemeToggle() {
  const { isDark, setColorScheme } = useTheme();
  const t = useThemeTokens();

  return (
    <Pressable
      onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-1.5 rounded-md active:bg-surface-overlay"
    >
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} color={t['text-secondary']} size={16} />
    </Pressable>
  );
}
