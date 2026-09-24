import { View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { cn } from '@/utils/cn';

type IconTileProps = { icon: IconDefinition; size?: 'sm' | 'md'; className?: string };

const box = { sm: 'h-8 w-8', md: 'h-9 w-9' };
const glyph = { sm: 14, md: 16 };

/** Rounded primary-subtle square holding an icon (stat cards, link tiles, org rows). */
export function IconTile({ icon, size = 'md', className }: IconTileProps) {
  const t = useThemeTokens();
  return (
    <View className={cn('items-center justify-center rounded-lg bg-primary-subtle', box[size], className)} accessible={false}>
      <FontAwesomeIcon icon={icon} size={glyph[size]} color={t.primary} />
    </View>
  );
}
