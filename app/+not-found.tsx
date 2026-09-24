import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { faCompass } from '@fortawesome/free-solid-svg-icons';
import { EmptyState } from '@/components/ui';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center bg-surface-base px-4">
      <EmptyState
        icon={faCompass}
        title={t('NOT_FOUND.TITLE')}
        description={t('NOT_FOUND.DESC')}
        actionLabel={t('NOT_FOUND.HOME')}
        onAction={() => router.replace('/')}
      />
    </View>
  );
}
