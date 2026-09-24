import { Pressable, Text } from 'react-native';
import { Link, type Href } from 'expo-router';

/** "Don't have an account? Sign up" — prompt in secondary, link in primary. */
export function AuthFooterLink({ prompt, label, href, testID }: { prompt?: string; label: string; href: Href; testID?: string }) {
  return (
    <>
      {prompt ? <Text className="text-sm text-text-secondary">{prompt}</Text> : null}
      <Link href={href} asChild>
        <Pressable accessibilityRole="link" hitSlop={8} testID={testID}>
          <Text className="text-sm font-medium text-primary">{label}</Text>
        </Pressable>
      </Link>
    </>
  );
}
