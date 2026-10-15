import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner-native';
import { DropdownMenu, Spinner, Text } from '@/components/ui';
import { changeLanguage } from '@/libs/preferences';
import { localeOption, useLocales } from '@/libs/translations';
import { useTranslationStore } from '@/stores/translationStore';

/** next-boilerplate's language switcher: flag + code trigger, flag + endonym menu. */
export function LangSwitcher() {
  const { t, i18n } = useTranslation();
  const locales = useLocales();
  const current = localeOption(i18n.language ?? 'en', locales);
  const switching = useTranslationStore((s) => s.switchingTo) !== null;

  const switchTo = async (lang: string) => {
    if (!(await changeLanguage(lang))) toast.error(t('PREFERENCES.LANGUAGE_UNAVAILABLE'));
  };

  return (
    <DropdownMenu
      align="right"
      trigger={
        // Must be a Pressable: DropdownMenu injects onPress into the trigger element.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={switching ? t('PREFERENCES.LANGUAGE_DOWNLOADING') : t('SHELL.LANGUAGE_A11Y', { language: current.name })}
          accessibilityState={{ busy: switching }}
          testID="shell-lang-trigger"
          className="min-h-[36px] flex-row items-center gap-1.5 rounded-md px-2 active:bg-surface-overlay"
        >
          {switching ? <Spinner size="sm" accessibilityLabel={t('PREFERENCES.LANGUAGE_DOWNLOADING')} /> : <Text className="text-base">{current.flag}</Text>}
          <Text className="text-xs font-medium text-text-secondary">{current.code.toUpperCase()}</Text>
        </Pressable>
      }
      items={locales.map((lang) => ({
        label: lang.name,
        icon: lang.flag,
        onPress: () => void switchTo(lang.code),
        disabled: switching || lang.code === current.code, // one download at a time
      }))}
    />
  );
}
