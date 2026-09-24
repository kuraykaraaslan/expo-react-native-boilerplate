import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEllipsisVertical, faPen, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { MemberStatusBadge, RoleBadge } from '@/components/common/Badges';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Screen, useListContentStyle } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EditMemberModal } from '@/components/tenant/EditMemberModal';
import { InviteMemberModal } from '@/components/tenant/InviteMemberModal';
import { NoOrganization } from '@/components/tenant/NoOrganization';
import { Avatar, DropdownMenu, EmptyState, SearchBar, Spinner } from '@/components/ui';
import type { TenantMember } from '@/dto/tenant.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { TenantClientService } from '@/services/tenant.service.client';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<TenantMember | null>(null);
  const [removing, setRemoving] = useState<TenantMember | null>(null);

  const load = useCallback(async () => {
    if (!membership) return;
    try {
      const { members: list } = await TenantClientService.getMembers(membership.tenantId);
      setMembers(list);
    } catch (err: unknown) {
      handleApiError(err, 'MembersScreen.load');
    }
  }, [membership]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function remove(m: TenantMember) {
    try {
      await TenantClientService.removeMember(m.tenantId, m.tenantMemberId);
      setMembers((prev) => prev.filter((x) => x.tenantMemberId !== m.tenantMemberId));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('MEMBERS.REMOVED'));
    } catch (err: unknown) {
      handleApiError(err, 'MembersScreen.remove');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => `${m.user?.email ?? ''} ${m.user?.userProfile?.name ?? ''}`.toLowerCase().includes(q));
  }, [members, query]);

  if (!membership) {
    return (
      <Screen>
        <ScreenHeader back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }} title={t('MEMBERS.TITLE')} subtitle={t('MEMBERS.SUBTITLE')} />
        <NoOrganization />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(m) => m.tenantMemberId}
        contentContainerStyle={listStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.primary} colors={[tokens.primary]} />}
        ListHeaderComponent={
          <View className="mb-4 gap-6">
            <ScreenHeader
              back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }}
              title={t('MEMBERS.TITLE')}
              subtitle={t('MEMBERS.SUBTITLE')}
              actions={canManage ? [{ label: t('MEMBERS.INVITE'), onPress: () => setInviteOpen(true) }] : undefined}
            />
            <View className="gap-2">
              <Text className="text-sm font-medium text-text-primary">{t('MEMBERS.SEARCH_LABEL')}</Text>
              <SearchBar id="members-search" value={query} onChange={setQuery} placeholder={t('MEMBERS.SEARCH_PLACEHOLDER')} />
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
                index === filtered.length - 1 ? 'rounded-b-xl border-b' : 'border-b',
              )}
              testID={`members-row-${item.tenantMemberId}`}
            >
              <Avatar name={name} src={item.user?.userProfile?.profilePicture ?? undefined} size="sm" />
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
                  {name}
                  {isSelf ? <Text className="font-normal text-text-secondary">{`  · ${t('MEMBERS.YOU')}`}</Text> : null}
                </Text>
                {item.user?.userProfile?.name && item.user?.email ? (
                  <Text className="text-xs text-text-secondary" numberOfLines={1}>
                    {item.user.email}
                  </Text>
                ) : null}
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <RoleBadge role={item.memberRole} />
                  {item.memberStatus !== 'ACTIVE' ? <MemberStatusBadge status={item.memberStatus} /> : null}
                  <Text className="text-xs text-text-disabled">{t('MEMBERS.JOINED', { date: formatDate(item.createdAt) })}</Text>
                </View>
              </View>
              {manageable ? (
                <DropdownMenu
                  align="right"
                  trigger={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t('COMMON.MORE_ACTIONS')}: ${name}`}
                      testID={`members-row-menu-${item.tenantMemberId}`}
                      className="h-9 w-9 items-center justify-center rounded-md active:bg-surface-overlay"
                    >
                      <FontAwesomeIcon icon={faEllipsisVertical} size={14} color={tokens['text-secondary']} />
                    </Pressable>
                  }
                  items={[
                    { label: t('COMMON.EDIT'), icon: <FontAwesomeIcon icon={faPen} size={12} color={tokens['text-secondary']} />, onPress: () => setEditing(item) },
                    { label: t('COMMON.REMOVE'), icon: <FontAwesomeIcon icon={faTrash} size={12} color={tokens.error} />, danger: true, onPress: () => setRemoving(item) },
                  ]}
                />
              ) : null}
            </View>
          );
        }}
        ListFooterComponent={
          !loading && filtered.length > 0 ? (
            <Text className="mt-3 text-xs text-text-secondary">
              {t('COMMON.SHOWING_RANGE', { start: 1, end: filtered.length, total: members.length })}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-16" accessibilityState={{ busy: true }}>
              <Spinner size="lg" />
            </View>
          ) : query ? (
            <Text className="py-10 text-center text-sm text-text-secondary">{t('COMMON.NO_RESULTS')}</Text>
          ) : (
            <EmptyState icon={faUsers} title={t('MEMBERS.EMPTY')} />
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
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t('MEMBERS.REMOVE_TITLE')}
        description={t('MEMBERS.REMOVE_DESC', { email: removing ? memberName(removing) : '' })}
        confirmLabel={t('COMMON.REMOVE')}
        onConfirm={() => (removing ? remove(removing) : undefined)}
      />
    </Screen>
  );
}
