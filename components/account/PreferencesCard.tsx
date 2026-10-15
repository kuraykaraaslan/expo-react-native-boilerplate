import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Card, Select } from '@/components/ui';
import { changeLanguage, pushPreferences } from '@/libs/preferences';
import { useTheme } from '@/libs/theme/ThemeContext';
import { useLocales } from '@/libs/translations';
import { useAppStore } from '@/stores/appStore';
import { useTranslationStore } from '@/stores/translationStore';

/** next-boilerplate "Tercihler" → appearance + language; applied immediately and persisted (MMKV). */
export function PreferencesCard() {
  const { t } = useTranslation();
  const { colorScheme, setColorScheme } = useTheme();
  const locale = useAppStore((s) => s.locale);
  const locales = useLocales();
  const switching = useTranslationStore((s) => s.switchingTo) !== null;

  async function onLanguage(code: string) {
    if (await changeLanguage(code)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(t('PREFERENCES.LANGUAGE_UNAVAILABLE'));
    }
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
          onChange={(code) => void onLanguage(code)}
          disabled={switching}
          hint={switching ? t('PREFERENCES.LANGUAGE_DOWNLOADING') : undefined}
          options={locales.map((l) => ({ value: l.code, label: `${l.flag}  ${l.name}` }))}
        />
      </View>
    </Card>
  );
}
