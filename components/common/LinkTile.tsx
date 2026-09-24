import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { cn } from '@/utils/cn';
import { Text } from '@/components/ui';
import { IconTile } from './IconTile';

type LinkTileProps = {
  icon: IconDefinition;
  title: string;
  description?: string;
  href?: Href;
  onPress?: () => void;
  danger?: boolean;
  testID?: string;
};

/** next-boilerplate settings/launcher tile: icon tile, title, description, chevron. */
export function LinkTile({ icon, title, description, href, onPress, danger, testID }: LinkTileProps) {
  const t = useThemeTokens();
  return (
    <Pressable
      onPress={onPress ?? (href ? () => router.push(href) : undefined)}
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityLabel={description ? `${title}, ${description}` : title}
      testID={testID}
      className="min-h-[60px] flex-row items-center gap-3 rounded-lg border border-border bg-surface-raised p-4 active:bg-surface-overlay"
    >
      {danger ? (
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-error-subtle" accessible={false}>
          <FontAwesomeIcon icon={icon} size={16} color={t.error} />
        </View>
      ) : (
        <IconTile icon={icon} />
      )}
      <View className="min-w-0 flex-1">
        <Text className={cn('text-sm font-medium', danger ? 'text-error' : 'text-text-primary')} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text className="mt-0.5 text-xs text-text-secondary" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {danger ? null : <FontAwesomeIcon icon={faChevronRight} size={12} color={t['text-disabled']} />}
    </Pressable>
  );
}
