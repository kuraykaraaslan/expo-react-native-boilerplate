import { Pressable, Text, View } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { cn } from '@/utils/cn';

type DrawerNavLinkProps = {
  href: string;
  label: string;
  icon: IconDefinition;
  exact?: boolean;
};

export function DrawerNavLink({ href, label, icon, exact = false }: DrawerNavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  const t = useThemeTokens();

  return (
    <Link href={href as any} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={isActive ? `${label}, current` : label}
        className={cn(
          'flex-row items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5',
          isActive ? 'bg-primary-subtle' : 'active:bg-surface-overlay',
        )}
      >
        <View className="w-5 items-center">
          <FontAwesomeIcon
            icon={icon}
            size={16}
            color={isActive ? t.primary : t['text-secondary']}
          />
        </View>
        <Text
          className={cn(
            'text-sm',
            isActive ? 'font-semibold text-primary' : 'font-normal text-text-secondary',
          )}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}
