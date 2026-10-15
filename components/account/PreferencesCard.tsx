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
      toast.error(t('user.preferences.languageUnavailable'));
    }
  }

  return (
    <Card title={t('user.preferences.card')} subtitle={t('user.preferences.cardDesc')}>
      <View className="gap-4">
        <Select
          id="preferences-theme"
          label={t('user.preferences.themeLabel')}
          value={colorScheme}
          onChange={(v) => {
            setColorScheme(v as 'light' | 'dark' | 'system');
            void pushPreferences({ colorScheme: v as 'light' | 'dark' | 'system' });
          }}
          options={[
            { value: 'light', label: t('user.preferences.themeLight') },
            { value: 'dark', label: t('user.preferences.themeDark') },
            { value: 'system', label: t('user.preferences.themeSystem') },
          ]}
        />
        <Select
          id="preferences-language"
          label={t('user.preferences.languageLabel')}
          value={locale}
          onChange={(code) => void onLanguage(code)}
          disabled={switching}
          hint={switching ? t('user.preferences.languageDownloading') : undefined}
          options={locales.map((l) => ({ value: l.code, label: `${l.flag}  ${l.name}` }))}
        />
      </View>
    </Card>
  );
}
