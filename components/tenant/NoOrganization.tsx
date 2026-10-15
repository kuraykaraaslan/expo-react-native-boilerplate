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
      title={t('tenant.organization.none')}
      description={t('tenant.organization.noneDesc')}
      actionLabel={t('tenant.organization.select')}
      onAction={() => router.push('/select-tenant')}
    />
  );
}
