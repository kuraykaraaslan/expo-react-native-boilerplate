import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Card, Select } from '@/components/ui';
import { LOCALE_META, SUPPORTED_LOCALES, type Locale } from '@/libs/i18n';
import { pushPreferences } from '@/libs/preferences';
import { useTheme } from '@/libs/theme/ThemeContext';
import { useAppStore } from '@/stores/appStore';

/** next-boilerplate "Tercihler" → appearance + language; applied immediately and persisted (MMKV). */
export function PreferencesCard() {
  const { t, i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useTheme();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  function changeLanguage(code: string) {
    i18n.changeLanguage(code);
    setLocale(code);
    void pushPreferences({ language: code });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <Card title={t('PREFERENCES.CARD')} subtitle={t('PREFERENCES.CARD_DESC')}>
      <View className="gap-4">
        <Select
          id="preferences-theme"
          label={t('PREFERENCES.THEME')}
          value={colorScheme}
          onChange={(v) => {
            setColorScheme(v as 'light' | 'dark' | 'system');
            void pushPreferences({ colorScheme: v as 'light' | 'dark' | 'system' });
          }}
          options={[
            { value: 'light', label: t('PREFERENCES.THEME_LIGHT') },
            { value: 'dark', label: t('PREFERENCES.THEME_DARK') },
            { value: 'system', label: t('PREFERENCES.THEME_SYSTEM') },
          ]}
        />
        <Select
          id="preferences-language"
          label={t('PREFERENCES.LANGUAGE')}
          value={locale}
          onChange={changeLanguage}
          options={SUPPORTED_LOCALES.map((code: Locale) => ({ value: code, label: `${LOCALE_META[code].flag}  ${LOCALE_META[code].name}` }))}
        />
      </View>
    </Card>
  );
}
