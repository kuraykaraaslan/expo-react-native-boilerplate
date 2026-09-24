import { Text, View } from 'react-native';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Spinner } from '@/components/ui';
import { IconTile } from './IconTile';

type StatTileProps = { icon: IconDefinition; label: string; value: number | string; loading?: boolean };

/** next-boilerplate dashboard stat card: icon tile, xs label, xl bold number. */
export function StatTile({ icon, label, value, loading }: StatTileProps) {
  return (
    <View
      className="flex-1 flex-row items-center gap-3 rounded-lg border border-border bg-surface-raised p-4"
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <IconTile icon={icon} />
      <View className="min-w-0 flex-1">
        <Text className="text-xs text-text-secondary" numberOfLines={2}>
          {label}
        </Text>
        {loading ? <Spinner size="sm" className="mt-1" /> : <Text className="text-xl font-bold text-text-primary">{value}</Text>}
      </View>
    </View>
  );
}
