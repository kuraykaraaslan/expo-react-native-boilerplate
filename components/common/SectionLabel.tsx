import { cn } from '@/utils/cn';
import { Text } from '@/components/ui';

/** Uppercase section heading — next-boilerplate's group/section label. */
export function SectionLabel({ children, className }: { children: string; className?: string }) {
  return (
    <Text accessibilityRole="header" className={cn('text-xs font-semibold uppercase tracking-wider text-text-secondary', className)}>
      {children}
    </Text>
  );
}
