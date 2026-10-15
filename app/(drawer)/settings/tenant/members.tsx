import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsisVertical, faPen, faTrash, faUserCheck, faUserSlash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { MemberStatusBadge, RoleBadge } from '@/components/common/Badges';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Screen, useListContentStyle } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EditMemberModal } from '@/components/tenant/EditMemberModal';
import { InviteMemberModal } from '@/components/tenant/InviteMemberModal';
import { NoOrganization } from '@/components/tenant/NoOrganization';
import { Avatar, DropdownMenu, EmptyState, SearchBar, Spinner, Text } from '@/components/ui';
import type { TenantMember } from '@/modules/tenant/tenant.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { TenantClientService } from '@/modules/tenant/tenant.service.client';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

const PAGE_SIZE = 20;

function memberName(m: TenantMember) {
  return m.user?.userProfile?.name ?? m.user?.email ?? m.userId;
}

export default function MembersScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const listStyle = useListContentStyle();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const myUserId = useAuthStore((s) => s.user?.userId);
  const canManage = membership?.memberRole === 'ADMIN' || membership?.memberRole === 'OWNER';

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useRef(0); // last page loaded (0-based)
  const seq = useRef(0); // drops answers of a superseded search
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<TenantMember | null>(null);
  const [removing, setRemoving] = useState<TenantMember | null>(null);
  const [suspending, setSuspending] = useState<TenantMember | null>(null);

  const load = useCallback(async () => {
    if (!membership) return;
    const mine = ++seq.current;
    try {
      const search = query.trim() || undefined;
      const res = await TenantClientService.getMembers(membership.tenantId, { page: 0, pageSize: PAGE_SIZE, search });
      if (mine !== seq.current) return;
      page.current = 0;
      setMembers(res.members);
      setTotal(res.total);
    } catch (err: unknown) {
      if (mine === seq.current) handleApiError(err, 'MembersScreen.load');
    }
  }, [membership, query]);

  // Debounced: typing in the search box re-queries the server.
  useEffect(() => {
    const id = setTimeout(() => {
      load().finally(() => setLoading(false));
    }, query ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, query]);

  async function loadMore() {
    if (!membership || loadingMore || loading || members.length >= total) return;
    const mine = seq.current;
    setLoadingMore(true);
    try {
      const search = query.trim() || undefined;
      const res = await TenantClientService.getMembers(membership.tenantId, { page: page.current + 1, pageSize: PAGE_SIZE, search });
      if (mine !== seq.current) return;
      page.current += 1;
      setMembers((prev) => {
        const seen = new Set(prev.map((m) => m.tenantMemberId));
        return [...prev, ...res.members.filter((m) => !seen.has(m.tenantMemberId))];
      });
      setTotal(res.total);
    } catch (err: unknown) {
      handleApiError(err, 'MembersScreen.loadMore');
    } finally {
      setLoadingMore(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function remove(m: TenantMember) {
    try {
      await TenantClientService.removeMember(m.tenantId, m.tenantMemberId);
      setMembers((prev) => prev.filter((x) => x.tenantMemberId !== m.tenantMemberId));
      setTotal((n) => Math.max(0, n - 1));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('tenant_member.list.removed'));
    } catch (err: unknown) {
      handleApiError(err, 'MembersScreen.remove');
    }
  }

  async function transition(m: TenantMember, action: 'suspend' | 'reactivate') {
    try {
      const updated = await TenantClientService.transitionMember(m.tenantId, m.tenantMemberId, { action });
      setMembers((prev) => prev.map((x) => (x.tenantMemberId === m.tenantMemberId ? { ...x, ...updated } : x)));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t(action === 'suspend' ? 'tenant_member.list.suspended' : 'tenant_member.list.reactivated'));
    } catch (err: unknown) {
      handleApiError(err, `MembersScreen.${action}`);
    }
  }

  if (!membership) {
    return (
      <Screen>
        <ScreenHeader back={{ label: t('account.settingsHub.title'), href: '/settings' }} title={t('tenant_member.list.title')} subtitle={t('tenant_member.list.subtitle')} />
        <NoOrganization />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={loading ? [] : members}
        keyExtractor={(m) => m.tenantMemberId}
        contentContainerStyle={listStyle}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.primary} colors={[tokens.primary]} />}
        ListHeaderComponent={
          <View className="mb-4 gap-6">
            <ScreenHeader
              back={{ label: t('account.settingsHub.title'), href: '/settings' }}
              title={t('tenant_member.list.title')}
              subtitle={t('tenant_member.list.subtitle')}
              actions={canManage ? [{ label: t('tenant_member.list.invite'), onPress: () => setInviteOpen(true) }] : undefined}
            />
            <View className="gap-2">
              <Text className="text-sm font-medium text-text-primary">{t('tenant_member.list.searchLabel')}</Text>
              <SearchBar id="members-search" value={query} onChange={setQuery} placeholder={t('tenant_member.list.searchPlaceholder')} />
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const isSelf = item.userId === myUserId;
          const manageable = canManage && !isSelf && item.memberRole !== 'OWNER';
          const name = memberName(item);
          return (
            <View
              className={cn(
                'flex-row items-center gap-3 border-x border-border bg-surface-raised px-4 py-3',
                index === 0 && 'rounded-t-xl border-t',
                index === members.length - 1 ? 'rounded-b-xl border-b' : 'border-b',
              )}
              testID={`members-row-${item.tenantMemberId}`}
            >
              <Avatar name={name} src={item.user?.userProfile?.profilePicture ?? undefined} size="sm" />
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
                  {name}
                  {isSelf ? <Text className="font-normal text-text-secondary">{`  · ${t('tenant_member.list.you')}`}</Text> : null}
                </Text>
                {item.user?.userProfile?.name && item.user?.email ? (
                  <Text className="text-xs text-text-secondary" numberOfLines={1}>
                    {item.user.email}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <RoleBadge role={item.memberRole} />
                  {item.memberStatus !== 'ACTIVE' ? <MemberStatusBadge status={item.memberStatus} /> : null}
                  <Text className="text-xs text-text-disabled">{t('tenant_member.list.joined', { date: formatDate(item.createdAt) })}</Text>
                </View>
              </View>
              {manageable ? (
                <DropdownMenu
                  align="right"
                  trigger={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t('common.actions.moreActions')}: ${name}`}
                      testID={`members-row-menu-${item.tenantMemberId}`}
                      className="h-9 w-9 items-center justify-center rounded-md active:bg-surface-overlay"
                    >
                      <FontAwesomeIcon icon={faEllipsisVertical} size={14} color={tokens['text-secondary']} />
                    </Pressable>
                  }
                  items={[
                    { label: t('common.actions.edit'), icon: <FontAwesomeIcon icon={faPen} size={12} color={tokens['text-secondary']} />, onPress: () => setEditing(item) },
                    item.memberStatus === 'SUSPENDED'
                      ? { label: t('tenant_member.list.reactivate'), icon: <FontAwesomeIcon icon={faUserCheck} size={12} color={tokens['text-secondary']} />, onPress: () => transition(item, 'reactivate') }
                      : { label: t('tenant_member.list.suspend'), icon: <FontAwesomeIcon icon={faUserSlash} size={12} color={tokens['text-secondary']} />, onPress: () => setSuspending(item) },
                    { label: t('common.actions.remove'), icon: <FontAwesomeIcon icon={faTrash} size={12} color={tokens.error} />, danger: true, onPress: () => setRemoving(item) },
                  ]}
                />
              ) : null}
            </View>
          );
        }}
        ListFooterComponent={
          loadingMore ? (
            <View className="items-center py-4" accessibilityState={{ busy: true }}>
              <Spinner size="sm" />
            </View>
          ) : !loading && members.length > 0 ? (
            <Text className="mt-3 text-xs text-text-secondary">
              {t('common.serverDataTable.range', { start: 1, end: members.length, total })}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-16" accessibilityState={{ busy: true }}>
              <Spinner size="lg" />
            </View>
          ) : query ? (
            <Text className="py-10 text-center text-sm text-text-secondary">{t('common.select.noResults')}</Text>
          ) : (
            <EmptyState icon={faUsers} title={t('tenant_member.list.empty')} />
          )
        }
      />

      <InviteMemberModal tenantId={membership.tenantId} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <EditMemberModal
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={(u) => setMembers((prev) => prev.map((m) => (m.tenantMemberId === u.tenantMemberId ? { ...m, ...u } : m)))}
      />
      <ConfirmDialog
        open={suspending !== null}
        onClose={() => setSuspending(null)}
        title={t('tenant_member.list.suspendTitle')}
        description={t('tenant_member.list.suspendDesc', { email: suspending ? memberName(suspending) : '' })}
        confirmLabel={t('tenant_member.list.suspend')}
        onConfirm={() => (suspending ? transition(suspending, 'suspend') : undefined)}
      />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t('tenant_member.list.removeTitle')}
        description={t('tenant_member.list.removeDesc', { email: removing ? memberName(removing) : '' })}
        confirmLabel={t('common.actions.remove')}
        onConfirm={() => (removing ? remove(removing) : undefined)}
      />
    </Screen>
  );
}
