import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { PageHeader, Text, type PageHeaderProps } from '@/components/ui';
import { useThemeTokens } from '@/libs/theme/ThemeContext';

type ScreenHeaderProps = PageHeaderProps & {
  /** Parent screen for the back link (sub-screens under Settings). */
  back?: { label: string; href: Href };
};

/**
 * next-boilerplate's page header (title, subtitle, badge, actions, divider),
 * with an optional back link above it — navigation chrome stays in the shared
 * AppHeader, so sub-screens get a breadcrumb-style link instead of a stack header.
 */
export function ScreenHeader({ back, ...props }: ScreenHeaderProps) {
  const t = useThemeTokens();
  return (
    <View className="gap-3">
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace(back.href))}
          accessibilityRole="link"
          accessibilityLabel={back.label}
          hitSlop={8}
          className="flex-row items-center gap-1.5 self-start py-1"
          testID="screen-header-back"
        >
          <FontAwesomeIcon icon={faChevronLeft} size={11} color={t['text-secondary']} />
          <Text className="text-sm font-medium text-text-secondary">{back.label}</Text>
        </Pressable>
      ) : null}
      <PageHeader {...props} />
    </View>
  );
}
