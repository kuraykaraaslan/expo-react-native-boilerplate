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
        title={t('common.notFound.title')}
        description={t('common.notFound.desc')}
        actionLabel={t('common.notFound.home')}
        onAction={() => router.replace('/')}
      />
    </View>
  );
}
