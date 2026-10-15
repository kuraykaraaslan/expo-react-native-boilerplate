import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuilding, faCalendar, faEnvelope, faUserShield } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { RoleBadge } from '@/components/common/Badges';
import { Badge, Card, Text } from '@/components/ui';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';
import { formatDate } from '@/utils/format';

function InfoRow({ icon, label, children, last }: { icon: IconDefinition; label: string; children: ReactNode; last?: boolean }) {
  const t = useThemeTokens();
  return (
    <View className={`min-h-[48px] flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-border'}`}>
      <FontAwesomeIcon icon={icon} size={14} color={t['text-disabled']} />
      <Text className="w-28 text-sm text-text-secondary">{label}</Text>
      <View className="min-w-0 flex-1 flex-row items-center justify-end">{children}</View>
    </View>
  );
}

/** next-boilerplate "Hesap güvenliği": label/value rows with icons and badges. */
export function SecurityCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const membership = useTenantStore((s) => s.selectedTenantMembership);

  return (
    <Card title={t('account.me.securityCard')} subtitle={t('account.me.securityCardSubtitle')}>
      <InfoRow icon={faEnvelope} label={t('account.me.emailLabel')}>
        <Text className="shrink text-sm font-medium text-text-primary" numberOfLines={1}>
          {user?.email ?? '—'}
        </Text>
      </InfoRow>
      <InfoRow icon={faUserShield} label={t('account.me.rowGlobalRole')}>
        <Badge variant={user?.userRole === 'ADMIN' ? 'error' : 'neutral'} size="sm">
          {user?.userRole ?? 'USER'}
        </Badge>
      </InfoRow>
      <InfoRow icon={faBuilding} label={t('account.me.rowTenantRole')}>
        {membership ? <RoleBadge role={membership.memberRole} /> : <Text className="text-sm text-text-disabled">—</Text>}
      </InfoRow>
      <InfoRow icon={faCalendar} label={t('account.me.rowMemberSince')} last>
        <Text className="text-sm text-text-primary">{formatDate(user?.createdAt) || '—'}</Text>
      </InfoRow>
    </Card>
  );
}
