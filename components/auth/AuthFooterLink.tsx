import { Pressable } from 'react-native';
import { Link, type Href } from 'expo-router';
import { Text } from '@/components/ui';

type AuthFooterLinkProps = {
  prompt?: string;
  label: string;
  testID?: string;
} & ({ href: Href; onPress?: never } | { onPress: () => void; href?: never });

/** "Don't have an account? Sign up" — prompt in secondary, link in primary. Navigates (`href`) or acts (`onPress`). */
export function AuthFooterLink({ prompt, label, href, onPress, testID }: AuthFooterLinkProps) {
  const link = (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress} testID={testID}>
      <Text className="text-sm font-medium text-primary">{label}</Text>
    </Pressable>
  );
  return (
    <>
      {prompt ? <Text className="text-sm text-text-secondary">{prompt}</Text> : null}
      {href ? <Link href={href} asChild>{link}</Link> : link}
    </>
  );
}
