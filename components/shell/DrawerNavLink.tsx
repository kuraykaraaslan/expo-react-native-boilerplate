import { Pressable, Text, View } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTheme } from '@/libs/theme/ThemeContext';

type DrawerNavLinkProps = {
  href: string;
  label: string;
  icon: IconDefinition;
  exact?: boolean;
};

export function DrawerNavLink({ href, label, icon, exact = false }: DrawerNavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  const { tokens: t } = useTheme();

  return (
    <Link href={href as any} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={isActive ? `${label}, current` : label}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 8,
          marginBottom: 2,
          backgroundColor: isActive
            ? t.primarySubtle
            : pressed
              ? t.surfaceOverlay
              : 'transparent',
        })}
      >
        <View style={{ width: 20, alignItems: 'center' }}>
          <FontAwesomeIcon
            icon={icon}
            size={16}
            color={isActive ? t.primary : t.textSecondary}
          />
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: isActive ? '600' : '400',
            color: isActive ? t.primary : t.textSecondary,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}
