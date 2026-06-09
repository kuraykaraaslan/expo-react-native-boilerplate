import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/libs/theme/ThemeContext';

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const { tokens: t } = useTheme();

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
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: pressed ? t.primarySubtle : t.primarySubtle,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {initials ? (
        <Text style={{ fontSize: 12, fontWeight: '600', color: t.primary }}>
          {initials}
        </Text>
      ) : (
        <FontAwesomeIcon icon={faUser} color={t.primary} size={14} />
      )}
    </Pressable>
  );
}
