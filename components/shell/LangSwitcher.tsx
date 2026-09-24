import { Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@/components/ui';
import { LOCALE_META, SUPPORTED_LOCALES, type Locale } from '@/libs/i18n';
import { useAppStore } from '@/stores/appStore';

/** next-boilerplate's language switcher: flag + code trigger, flag + endonym menu. */
export function LangSwitcher() {
  const { t, i18n } = useTranslation();
  const setLocale = useAppStore((s) => s.setLocale);
  const code = (i18n.language ?? 'en').split('-')[0];
  const locale: Locale = code in LOCALE_META ? (code as Locale) : 'en';

  const switchTo = (lang: Locale) => {
    i18n.changeLanguage(lang);
    setLocale(lang);
  };

  return (
    <DropdownMenu
      align="right"
      trigger={
        // Must be a Pressable: DropdownMenu injects onPress into the trigger element.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('SHELL.LANGUAGE_A11Y', { language: LOCALE_META[locale].name })}
          testID="shell-lang-trigger"
          className="min-h-[36px] flex-row items-center gap-1.5 rounded-md px-2 active:bg-surface-overlay"
        >
          <Text className="text-base">{LOCALE_META[locale].flag}</Text>
          <Text className="text-xs font-medium text-text-secondary">{locale.toUpperCase()}</Text>
        </Pressable>
      }
      items={SUPPORTED_LOCALES.map((lang) => ({
        label: LOCALE_META[lang].name,
        icon: LOCALE_META[lang].flag,
        onPress: () => switchTo(lang),
        disabled: lang === locale,
      }))}
    />
  );
}
