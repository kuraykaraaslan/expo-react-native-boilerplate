import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@/libs/theme/ThemeContext';

const SUPPORTED_LOCALES = ['tr', 'en'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export function LangSwitcher() {
  const { i18n } = useTranslation();
  const setLocale = useAppStore((s) => s.setLocale);
  const { tokens: t } = useTheme();
  const locale = ((i18n.language ?? 'en').split('-')[0]) as Locale;

  const switchTo = (lang: Locale) => {
    i18n.changeLanguage(lang);
    setLocale(lang);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {SUPPORTED_LOCALES.map((lang, i) => (
        <View key={lang} style={{ flexDirection: 'row', alignItems: 'center' }}>
          {i > 0 && (
            <Text style={{ color: t.border, fontSize: 12, marginHorizontal: 2 }}>
              |
            </Text>
          )}
          <Pressable
            onPress={() => switchTo(lang)}
            accessibilityRole="button"
            accessibilityLabel={lang === 'tr' ? 'Switch to Turkish' : 'Switch to English'}
            accessibilityState={{ selected: locale === lang }}
            style={{ paddingHorizontal: 6, paddingVertical: 4 }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: locale === lang ? '700' : '400',
                color: locale === lang ? t.primary : t.textSecondary,
              }}
            >
              {lang.toUpperCase()}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
