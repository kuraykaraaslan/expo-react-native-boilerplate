import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuilding, faChevronRight, faPlus } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { AlertBanner, Badge, Button, EmptyState, Spinner, Text } from '@/components/ui';
import type { TenantMembership } from '@/services/tenant/tenant.dto';
import { handleApiError } from '@/libs/errorUtils';
import { logout } from '@/libs/logout';
import { switchToTenant } from '@/libs/tenantSwitch';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { TenantClientService } from '@/services/tenant/tenant.service.client';
import { useTenantStore } from '@/stores/tenantStore';
import { isSelectable, unavailableReason } from '@/utils/tenant';

function OrgRow({ item, current, onPress }: Readonly<{ item: TenantMembership; current: boolean; onPress: () => void }>) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const selectable = isSelectable(item);
  const name = item.tenant?.name ?? item.tenantId;
  const blocked = unavailableReason(item);
  const reason = blocked ? t(blocked.kind === 'membership' ? `AUTH_UI.MEMBERSHIP_${blocked.status}` : `ORGANIZATION.STATUS_${blocked.status}`) : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!selectable}
      accessibilityRole="button"
      accessibilityState={{ disabled: !selectable }}
      accessibilityLabel={t('AUTH_UI.SELECT_ORG_A11Y', { name })}
      testID={`auth-select-org-${item.tenantId}`}
      className={`min-h-[60px] flex-row items-center gap-3 rounded-lg border border-border px-4 py-3 ${selectable ? 'active:bg-surface-overlay' : 'opacity-60'}`}
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
      {reason ? (
        <Badge variant="warning" size="sm">
          {reason}
        </Badge>
      ) : current ? (
        <Badge variant="primary" size="sm">
          {t('AUTH_UI.ORG_CURRENT')}
        </Badge>
      ) : (
        <FontAwesomeIcon icon={faChevronRight} size={12} color={tokens['text-disabled']} />
      )}
    </Pressable>
  );
}

export default function SelectTenantScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const memberships = useTenantStore((s) => s.memberships);
  const invitations = useTenantStore((s) => s.pendingInvitations);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const needsTenantSelection = useTenantStore((s) => s.needsTenantSelection);
  const setTenantOverview = useTenantStore((s) => s.setTenantOverview);

  useEffect(() => {
    let cancelled = false;
    TenantClientService.getMyTenants()
      .then((overview) => !cancelled && setTenantOverview(overview))
      .catch((err: unknown) => handleApiError(err, 'SelectTenantScreen.load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [setTenantOverview]);

  async function handleSelect(membership: TenantMembership) {
    setSwitching(membership.tenantId);
    try {
      const outcome = await switchToTenant(membership);
      if (outcome === 'login-required') {
        router.push({ pathname: '/tenant-login', params: { tenantId: membership.tenantId, name: membership.tenant.name } });
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.replace('/');
    } catch (err: unknown) {
      handleApiError(err, 'SelectTenantScreen.select');
    } finally {
      setSwitching(null);
    }
  }

  const available = memberships.filter(isSelectable);
  const unavailable = memberships.filter((m) => !isSelectable(m));

  return (
    <AuthShell
      title={t('AUTH_UI.SELECT_ORG_TITLE')}
      subtitle={t('AUTH_UI.SELECT_ORG_SUBTITLE')}
      icon={faBuilding}
      footer={
        needsTenantSelection ? (
          <AuthFooterLink label={t('AUTH_UI.SIGN_OUT')} onPress={() => void logout()} testID="auth-select-org-signout" />
        ) : (
          <AuthFooterLink label={t('AUTH_UI.BACK_TO_APP')} href="/" testID="auth-select-org-back" />
        )
      }
    >
      {invitations.length > 0 ? <AlertBanner variant="info" message={t('AUTH_UI.PENDING_INVITES', { count: invitations.length })} /> : null}
      {loading && memberships.length === 0 ? (
        <View className="items-center py-8" accessibilityState={{ busy: true }}>
          <Spinner size="lg" />
        </View>
      ) : memberships.length === 0 ? (
        <EmptyState icon={faBuilding} title={t('AUTH_UI.NO_ORGS')} description={t('AUTH_UI.NO_ORGS_DESC')} className="py-6" />
      ) : (
        // Short list inside the card — FlatList would nest inside AuthShell's ScrollView.
        <View className="gap-2">
          {available.map((m) => (
            <OrgRow key={m.tenantMemberId} item={m} current={m.tenantId === activeTenantId && !needsTenantSelection} onPress={() => void handleSelect(m)} />
          ))}
          {unavailable.length > 0 ? (
            <Text className="mt-2 text-xs font-medium uppercase tracking-widest text-text-disabled">{t('AUTH_UI.ORGS_UNAVAILABLE')}</Text>
          ) : null}
          {unavailable.map((m) => (
            <OrgRow key={m.tenantMemberId} item={m} current={false} onPress={() => undefined} />
          ))}
        </View>
      )}
      {switching ? (
        <View className="items-center" accessibilityState={{ busy: true }}>
          <Spinner size="sm" />
        </View>
      ) : null}
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
