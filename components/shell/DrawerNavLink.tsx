import { Pressable, View } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { cn } from '@/utils/cn';
import { Text } from '@/components/ui';

type DrawerNavLinkProps = {
  href: string;
  label: string;
  icon: IconDefinition;
  exact?: boolean;
  /** Unread count shown at the end of the row (hidden at 0). */
  badge?: number;
};

export function DrawerNavLink({ href, label, icon, exact = false, badge = 0 }: DrawerNavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  const t = useThemeTokens();

  return (
    <Link href={href as any} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={isActive ? `${label}, current` : label}
        testID={`shell-nav-${href.replace(/\//g, '-').replace(/^-/, '') || 'home'}`}
        className={cn(
          'min-h-[40px] flex-row items-center gap-2.5 rounded-lg px-3 py-2',
          isActive ? 'bg-primary-subtle' : 'active:bg-surface-overlay',
        )}
      >
        <View className="w-5 items-center">
          <FontAwesomeIcon icon={icon} size={15} color={isActive ? t.primary : t['text-secondary']} />
        </View>
        <Text className={cn('shrink text-sm', isActive ? 'font-medium text-primary' : 'text-text-secondary')} numberOfLines={1}>
          {label}
        </Text>
        {badge > 0 ? (
          <View className="ml-auto h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1">
            <Text className="text-[10px] font-bold text-text-inverse">{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}
