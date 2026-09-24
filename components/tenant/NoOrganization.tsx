import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';
import { EmptyState } from '@/components/ui';

/** Access-denied style empty state for organization screens without a selected tenant. */
export function NoOrganization() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={faBuilding}
      title={t('ORGANIZATION.NONE')}
      description={t('ORGANIZATION.NONE_DESC')}
      actionLabel={t('ORGANIZATION.SELECT')}
      onAction={() => router.push('/select-tenant')}
    />
  );
}
