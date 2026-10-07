import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDesktop, faLaptop, faMobileScreen } from '@fortawesome/free-solid-svg-icons';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Badge, Button, Card, EmptyState, Text } from '@/components/ui';
import type { Session } from '@/services/auth/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { getSessionIdFromToken } from '@/libs/jwt';
import { logout } from '@/libs/logout';
import { getToken } from '@/libs/secureStorage';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth/auth.service.client';
import { formatDate } from '@/utils/format';
import { describeSession } from '@/utils/session';
import { getActiveTenantId } from '@/stores/tenantStore';

function SessionRow({ item, current, last, onRevoke }: { item: Session; current: boolean; last: boolean; onRevoke: () => void }) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const { name, location, mobile } = describeSession(item);
  const device = name ?? t('SESSIONS.UNKNOWN_DEVICE');
  return (
    <View className={`flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-border'}`}>
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-surface-overlay" accessible={false}>
        <FontAwesomeIcon icon={mobile ? faMobileScreen : name ? faLaptop : faDesktop} size={15} color={tokens['text-secondary']} />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="shrink text-sm font-medium text-text-primary" numberOfLines={1}>
            {device}
          </Text>
          {current ? (
            <Badge variant="success" size="sm">
              {t('SESSIONS.THIS_DEVICE')}
            </Badge>
          ) : null}
        </View>
        <Text className="text-xs text-text-secondary" numberOfLines={1}>
          {[location, item.ipAddress ?? t('SESSIONS.UNKNOWN_IP')].filter(Boolean).join(' · ')}
        </Text>
        <Text className="text-xs text-text-secondary" numberOfLines={1}>
          {t('SESSIONS.STARTED', { date: formatDate(item.createdAt) })}
        </Text>
      </View>
      <Button size="sm" variant="outline" onPress={onRevoke} accessibilityLabel={`${t('SESSIONS.REVOKE')}: ${device}`} testID={`account-sessions-revoke-${item.userSessionId}`}>
        <Text className="text-xs font-medium text-error">{current ? t('SESSIONS.SIGN_OUT') : t('SESSIONS.REVOKE')}</Text>
      </Button>
    </View>
  );
}

/** next-boilerplate "Etkin Oturumlar" card: device rows with a red outline revoke. */
export function SessionsCard() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Session | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken('accessToken', getActiveTenantId());
      setCurrentId(token ? getSessionIdFromToken(token) : null);
      setSessions(await AuthClientService.getSessions());
    } catch (err: unknown) {
      handleApiError(err, 'SessionsCard.load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(session: Session) {
    // Ending the session this device is using is a sign-out: clear tokens and leave.
    if (session.userSessionId === currentId) {
      await logout();
      return;
    }
    try {
      await AuthClientService.revokeSession(session.userSessionId);
      setSessions((prev) => prev.filter((s) => s.userSessionId !== session.userSessionId));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('SESSIONS.REVOKED'));
    } catch (err: unknown) {
      handleApiError(err, 'SessionsCard.revoke');
    }
  }

  return (
    <>
      <Card title={t('SESSIONS.CARD')} subtitle={t('SESSIONS.CARD_DESC', { count: sessions.length })} loading={loading}>
        {sessions.length === 0 ? (
          <EmptyState icon={faLaptop} title={t('SESSIONS.EMPTY')} className="py-8" />
        ) : (
          sessions.map((s, i) => <SessionRow key={s.userSessionId} item={s} current={s.userSessionId === currentId} last={i === sessions.length - 1} onRevoke={() => setTarget(s)} />)
        )}
      </Card>
      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target?.userSessionId === currentId ? t('SESSIONS.SIGN_OUT_TITLE') : t('SESSIONS.REVOKE_TITLE')}
        description={target?.userSessionId === currentId ? t('SESSIONS.SIGN_OUT_DESC') : t('SESSIONS.REVOKE_DESC', { device: (target ? describeSession(target).name : null) ?? t('SESSIONS.UNKNOWN_DEVICE') })}
        confirmLabel={target?.userSessionId === currentId ? t('SESSIONS.SIGN_OUT') : t('SESSIONS.REVOKE')}
        onConfirm={() => (target ? revoke(target) : undefined)}
      />
    </>
  );
}
