import { Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '@/libs/theme/ThemeContext';

export function ThemeToggle() {
  const { isDark, colorScheme, setColorScheme, tokens: t } = useTheme();

  const toggle = () => {
    if (colorScheme === 'system') {
      setColorScheme(isDark ? 'light' : 'dark');
    } else {
      setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
    }
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={({ pressed }) => ({
        padding: 6,
        borderRadius: 6,
        backgroundColor: pressed ? t.surfaceOverlay : 'transparent',
      })}
    >
      <FontAwesomeIcon
        icon={isDark ? faSun : faMoon}
        color={t.textSecondary}
        size={16}
      />
    </Pressable>
  );
}
