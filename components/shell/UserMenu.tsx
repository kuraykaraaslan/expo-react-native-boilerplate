import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { useAuthStore } from '@/stores/authStore';

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const t = useThemeTokens();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : null;

  return (
    <Pressable
      onPress={() => router.push('/settings/profile' as any)}
      accessibilityRole="button"
      accessibilityLabel="Open profile settings"
      className="w-8 h-8 rounded-full items-center justify-center bg-primary-subtle active:opacity-80"
    >
      {initials ? (
        <Text className="text-xs font-semibold text-primary">{initials}</Text>
      ) : (
        <FontAwesomeIcon icon={faUser} color={t.primary} size={14} />
      )}
    </Pressable>
  );
}
