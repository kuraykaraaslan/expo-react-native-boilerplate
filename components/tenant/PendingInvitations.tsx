import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';
import { RoleBadge } from '@/components/common/Badges';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { answerInvitation, invitationErrorKey, invitationIsGone, refreshTenantOverview } from '@/libs/invitations';
import logger from '@/libs/logger';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import type { Invitation, MemberRole } from '@/services/tenant/tenant.dto';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { formatDate } from '@/utils/format';

type Joined = { invitationId: string; tenantId: string; name: string; memberRole: MemberRole };

const orgName = (i: Invitation) => i.tenant?.name ?? i.tenantId;

/**
 * Invitations waiting for the signed-in account (GET /auth/me/tenants), each with
 * Accept / Decline. Decline asks for confirmation. A joined organization stays on
 * screen with a "Sign in" button: a device token is bound to one tenant (K2), so
 * the new organization needs its own sign-in (tenant-login).
 */
export function PendingInvitations({ refreshOnMount = false }: Readonly<{ refreshOnMount?: boolean }>) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const invitations = useTenantStore((s) => s.pendingInvitations);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declining, setDeclining] = useState<Invitation | null>(null);
  const [joined, setJoined] = useState<Joined[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Another organization became active: its list is not this one's, and the "joined" notes belong to the old session.
  useEffect(() => {
    setJoined([]);
    setDeclining(null);
  }, [activeTenantId]);

  useEffect(() => {
    if (refreshOnMount) void refreshTenantOverview();
  }, [refreshOnMount]);

  async function answer(invitation: Invitation, action: 'accept' | 'decline') {
    const tenantAtStart = getActiveTenantId();
    setBusyId(invitation.invitationId);
    try {
      const result = await answerInvitation(invitation, action);
      if (result.stale || !mounted.current || getActiveTenantId() !== tenantAtStart) return;
      if (action === 'accept') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setJoined((prev) => [
          ...prev,
          { invitationId: invitation.invitationId, tenantId: invitation.tenantId, name: orgName(invitation), memberRole: result.memberRole ?? invitation.memberRole },
        ]);
        toast.success(t('MY_INVITATIONS.ACCEPTED', { name: orgName(invitation) }));
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        toast.success(t('MY_INVITATIONS.DECLINED', { name: orgName(invitation) }));
      }
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const key = invitationErrorKey(err);
      if (key) {
        logger.warn('[PendingInvitations]', action, key);
        toast.error(t(key));
      } else {
        handleApiError(err, `PendingInvitations.${action}`);
      }
      // 404 / 409 / 410: the invitation cannot be answered any more — let the server's list drop it.
      if (invitationIsGone(err)) void refreshTenantOverview();
    } finally {
      if (mounted.current) setBusyId(null);
    }
  }

  function signInTo(item: Joined) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/tenant-login', params: { tenantId: item.tenantId, name: item.name } });
  }

  if (invitations.length === 0 && joined.length === 0) return null;
  const joinedIds = new Set(joined.map((j) => j.invitationId));

  return (
    <View className="gap-2" testID="pending-invitations">
      <Text className="text-xs font-medium uppercase tracking-widest text-text-disabled">{t('MY_INVITATIONS.TITLE', { count: invitations.length })}</Text>
      {joined.map((item) => (
        <View key={item.invitationId} className="gap-3 rounded-lg border border-primary bg-primary-subtle px-4 py-3" testID={`pending-invitation-joined-${item.invitationId}`}>
          <View className="flex-row items-center gap-2">
            <FontAwesomeIcon icon={faCheck} size={14} color={tokens['text-primary']} />
            <Text className="min-w-0 flex-1 text-sm font-medium text-text-primary">{t('MY_INVITATIONS.JOINED', { name: item.name })}</Text>
            <RoleBadge role={item.memberRole} />
          </View>
          <Button size="sm" onPress={() => signInTo(item)} testID={`pending-invitation-signin-${item.invitationId}`}>
            {t('MY_INVITATIONS.SIGN_IN_TO', { name: item.name })}
          </Button>
        </View>
      ))}
      {invitations
        .filter((i) => !joinedIds.has(i.invitationId))
        .map((invitation) => {
          const busy = busyId === invitation.invitationId;
          return (
            <View key={invitation.invitationId} className="gap-3 rounded-lg border border-border px-4 py-3" testID={`pending-invitation-${invitation.invitationId}`}>
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary-subtle" accessible={false}>
                  <FontAwesomeIcon icon={faEnvelopeOpenText} size={14} color={tokens['text-primary']} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
                    {orgName(invitation)}
                  </Text>
                  {invitation.expiresAt ? (
                    <Text className="text-xs text-text-secondary">{t('MY_INVITATIONS.EXPIRES', { date: formatDate(invitation.expiresAt) })}</Text>
                  ) : null}
                </View>
                <RoleBadge role={invitation.memberRole} />
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button variant="outline" size="sm" fullWidth disabled={busyId !== null} onPress={() => setDeclining(invitation)} testID={`pending-invitation-decline-${invitation.invitationId}`}>
                    {t('MY_INVITATIONS.DECLINE')}
                  </Button>
                </View>
                <View className="flex-1">
                  <Button size="sm" fullWidth loading={busy} disabled={busyId !== null} onPress={() => void answer(invitation, 'accept')} testID={`pending-invitation-accept-${invitation.invitationId}`}>
                    {t('MY_INVITATIONS.ACCEPT')}
                  </Button>
                </View>
              </View>
            </View>
          );
        })}
      <ConfirmDialog
        open={declining !== null}
        onClose={() => setDeclining(null)}
        title={t('MY_INVITATIONS.DECLINE_TITLE')}
        description={t('MY_INVITATIONS.DECLINE_DESC', { name: declining ? orgName(declining) : '' })}
        confirmLabel={t('MY_INVITATIONS.DECLINE')}
        onConfirm={async () => {
          if (declining) await answer(declining, 'decline');
        }}
      />
    </View>
  );
}
