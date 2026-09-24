import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { BrandLogo } from '@/components/ui';
import { LangSwitcher } from '@/components/shell/LangSwitcher';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  /** Icon in the brand tile (defaults to the platform shield). */
  icon?: IconDefinition;
  children: ReactNode;
  /** Secondary prompt + link rendered centered below the card. */
  footer?: ReactNode;
};

/**
 * next-boilerplate's auth layout: a centered max-w-md card (rounded-2xl,
 * raised surface, border) with brand tile, heading and subtitle; secondary
 * link below the card. Language + theme toggles sit top-right
 * (appshell-compliance: auth screens exception).
 */
export function AuthShell({ title, subtitle, icon = faShieldHalved, children, footer }: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const t = useThemeTokens();

  return (
    <View className="flex-1 bg-surface-base" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-end gap-1 px-3 py-2">
        <LangSwitcher />
        <ThemeToggle />
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow items-center justify-center px-4 pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-md">
            <View
              className="gap-6 rounded-2xl border border-border bg-surface-raised p-6 shadow-sm"
              style={Platform.OS === 'android' ? { elevation: 1 } : undefined}
            >
              <View className="items-center gap-3">
                <BrandLogo size="md">
                  <FontAwesomeIcon icon={icon} size={20} color={t['primary-fg']} />
                </BrandLogo>
                <View className="items-center gap-1">
                  <Text accessibilityRole="header" className="text-center text-2xl font-bold text-text-primary">
                    {title}
                  </Text>
                  {subtitle ? <Text className="text-center text-sm text-text-secondary">{subtitle}</Text> : null}
                </View>
              </View>
              {children}
            </View>
            {footer ? <View className="mt-6 flex-row flex-wrap items-center justify-center gap-1">{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
