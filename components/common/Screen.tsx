import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { cn } from '@/utils/cn';

type ScreenProps = {
  children: ReactNode;
  /** false → children manage their own scrolling (e.g. a FlatList). */
  scroll?: boolean;
  /** Wrap in KeyboardAvoidingView — for screens with text inputs. */
  keyboard?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

/**
 * Drawer screen root: surface-base background, px-4 gutter, 24px section gap
 * and the bottom safe-area inset (the AppHeader already covers the top).
 */
export function Screen({ children, scroll = true, keyboard = false, refreshing, onRefresh, className }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const t = useThemeTokens();

  const body = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn('gap-6 px-4 pt-6', className)}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={t.primary} colors={[t.primary]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1', className)}>{children}</View>
  );

  return (
    <View className="flex-1 bg-surface-base">
      {keyboard ? (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

/** Content padding for FlatList-based screens, matching <Screen>. */
export function useListContentStyle() {
  const insets = useSafeAreaInsets();
  return { paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 24 };
}
