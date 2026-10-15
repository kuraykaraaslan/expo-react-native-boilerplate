import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  faBell,
  faBuilding,
  faCircleUser,
  faEnvelopeOpenText,
  faGear,
  faLaptop,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { LinkTile } from '@/components/common/LinkTile';
import { RoleBadge } from '@/components/common/Badges';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SectionLabel } from '@/components/common/SectionLabel';
import { StatTile } from '@/components/common/StatTile';
import { Button, Card, Text } from '@/components/ui';
import logger from '@/libs/logger';
import { AuthClientService } from '@/modules/auth/auth.service.client';
import { NotificationClientService } from '@/modules/user/notification.service.client';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTenantStore } from '@/stores/tenantStore';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const orgCount = useTenantStore((s) => s.memberships.length);
  const unread = useNotificationStore((s) => s.unreadCount);
  const setUnread = useNotificationStore((s) => s.setUnreadCount);
  const [sessions, setSessions] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard tiles are glanceable extras: failures are logged, not toasted.
  const load = useCallback(async () => {
    const [n, s] = await Promise.allSettled([NotificationClientService.getNotifications(), AuthClientService.getSessions()]);
    if (n.status === 'fulfilled') setUnread(n.value.filter((x) => !x.isRead).length);
    else logger.warn('[Dashboard] notifications', n.reason);
    if (s.status === 'fulfilled') setSessions(s.value.length);
    else logger.warn('[Dashboard] sessions', s.reason);
  }, [setUnread]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader title={t('dashboard.overview.titlePage')} subtitle={t('dashboard.page.subtitle')} />

      {membership ? (
        <Card
          title={t('dashboard.overview.currentOrg')}
          headerRight={
            <Button size="sm" variant="outline" onPress={() => router.push('/select-tenant')} testID="dashboard-switch-org">
              {t('dashboard.overview.switch')}
            </Button>
          }
        >
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle" accessible={false}>
              <Text className="text-base font-semibold text-primary">
                {(membership.tenant?.name ?? membership.tenantId).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-base font-semibold text-text-primary" numberOfLines={1}>
                {membership.tenant?.name ?? membership.tenantId}
              </Text>
              {membership.tenant?.description ? (
                <Text className="text-xs text-text-secondary" numberOfLines={1}>
                  {membership.tenant.description}
                </Text>
              ) : null}
            </View>
            <RoleBadge role={membership.memberRole} />
          </View>
        </Card>
      ) : null}

      <View className="gap-3">
        <View className="flex-row gap-3">
          <StatTile icon={faBell} label={t('dashboard.overview.statUnread')} value={unread} />
          <StatTile icon={faLaptop} label={t('dashboard.overview.statSessions')} value={sessions ?? '–'} loading={sessions === null} />
        </View>
        <StatTile icon={faBuilding} label={t('dashboard.overview.statOrgs')} value={orgCount} />
      </View>

      <View className="gap-3">
        <Text accessibilityRole="header" className="text-sm font-semibold text-text-primary">
          {t('dashboard.overview.title')}
        </Text>
        <SectionLabel>{t('app_shell.shell.groupAccount')}</SectionLabel>
        <LinkTile icon={faCircleUser} title={t('account.settingsHub.profile')} href="/settings/profile" testID="dashboard-link-profile" />
        <LinkTile icon={faBell} title={t('app_shell.shell.navNotifications')} href="/notifications" testID="dashboard-link-notifications" />
        <SectionLabel className="mt-2">{t('app_shell.shell.groupOrganization')}</SectionLabel>
        <LinkTile icon={faUsers} title={t('account.settingsHub.members')} href="/settings/tenant/members" testID="dashboard-link-members" />
        <LinkTile icon={faEnvelopeOpenText} title={t('account.settingsHub.invitations')} href="/settings/tenant/invitations" testID="dashboard-link-invitations" />
        <LinkTile icon={faGear} title={t('account.settingsHub.title')} href="/settings" testID="dashboard-link-settings" />
      </View>
    </Screen>
  );
}
