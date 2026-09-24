import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { DropdownMenu } from '@/components/ui';
import { SUPPORTED_LOCALES, type Locale } from '@/libs/i18n';
import { useAppStore } from '@/stores/appStore';

// Endonyms — each language is listed in its own name.
const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
};

export function LangSwitcher() {
  const { i18n } = useTranslation();
  const setLocale = useAppStore((s) => s.setLocale);
  const t = useThemeTokens();
  const locale = (i18n.language ?? 'en').split('-')[0] as Locale;

  const switchTo = (lang: Locale) => {
    i18n.changeLanguage(lang);
    setLocale(lang);
  };

  return (
    <DropdownMenu
      align="right"
      trigger={
        <View
          accessibilityLabel={`Language: ${LOCALE_NAMES[locale] ?? locale}`}
          className="flex-row items-center gap-1 px-1.5 py-1 rounded-md"
        >
          <FontAwesomeIcon icon={faGlobe} color={t['text-secondary']} size={14} />
          <Text className="text-xs font-bold text-text-secondary">{locale.toUpperCase()}</Text>
        </View>
      }
      items={SUPPORTED_LOCALES.map((lang) => ({
        label: lang === locale ? `${LOCALE_NAMES[lang]} ✓` : LOCALE_NAMES[lang],
        onPress: () => switchTo(lang),
      }))}
    />
  );
}
