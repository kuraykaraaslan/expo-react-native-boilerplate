import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuilding, faChevronRight, faPlus } from '@fortawesome/free-solid-svg-icons';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, EmptyState, Spinner, Text } from '@/components/ui';
import type { TenantMember } from '@/dto/tenant.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { TenantClientService } from '@/services/tenant.service.client';
import { useTenantStore } from '@/stores/tenantStore';

function OrgRow({ item, onPress }: { item: TenantMember; onPress: () => void }) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const name = item.tenant?.name ?? item.tenantId;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('AUTH_UI.SELECT_ORG_A11Y', { name })}
      testID={`auth-select-org-${item.tenantId}`}
      className="min-h-[60px] flex-row items-center gap-3 rounded-lg border border-border px-4 py-3 active:bg-surface-overlay"
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle" accessible={false}>
        <Text className="text-sm font-semibold text-primary">{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
          {name}
        </Text>
        {item.tenant?.description ? (
          <Text className="text-xs text-text-secondary" numberOfLines={1}>
            {item.tenant.description}
          </Text>
        ) : null}
        <Text className="text-xs text-text-disabled">{item.memberRole.toLowerCase()}</Text>
      </View>
      <FontAwesomeIcon icon={faChevronRight} size={12} color={tokens['text-disabled']} />
    </Pressable>
  );
}

export default function SelectTenantScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [memberships, setMemberships] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const selectMembership = useTenantStore((s) => s.selectMembership);
  const setMembershipsInStore = useTenantStore((s) => s.setMemberships);

  useEffect(() => {
    let cancelled = false;
    TenantClientService.getMyTenants()
      .then(({ tenants }) => {
        if (cancelled) return;
        setMemberships(tenants);
        setMembershipsInStore(tenants);
      })
      .catch((err: unknown) => handleApiError(err, 'SelectTenantScreen.load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [setMembershipsInStore]);

  async function handleSelect(member: TenantMember) {
    selectMembership(member);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/');
  }

  return (
    <AuthShell title={t('AUTH_UI.SELECT_ORG_TITLE')} subtitle={t('AUTH_UI.SELECT_ORG_SUBTITLE')} icon={faBuilding}>
      {loading ? (
        <View className="items-center py-8" accessibilityState={{ busy: true }}>
          <Spinner size="lg" />
        </View>
      ) : memberships.length === 0 ? (
        <EmptyState icon={faBuilding} title={t('AUTH_UI.NO_ORGS')} description={t('AUTH_UI.NO_ORGS_DESC')} className="py-6" />
      ) : (
        // Short list inside the card — FlatList would nest inside AuthShell's ScrollView.
        <View className="gap-2">
          {memberships.map((m) => (
            <OrgRow key={m.tenantMemberId} item={m} onPress={() => handleSelect(m)} />
          ))}
        </View>
      )}
      <View className="border-t border-border pt-4">
        <Button
          variant="outline"
          fullWidth
          onPress={() => router.push('/create-tenant')}
          iconLeft={<FontAwesomeIcon icon={faPlus} size={12} color={tokens['text-primary']} />}
          testID="auth-select-org-create"
        >
          {t('AUTH_UI.CREATE_ORG_LINK')}
        </Button>
      </View>
    </AuthShell>
  );
}
