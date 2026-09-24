import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDesktop, faLaptop, faMobileScreen } from '@fortawesome/free-solid-svg-icons';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button, Card, EmptyState } from '@/components/ui';
import type { Session } from '@/dto/auth.dto';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { AuthClientService } from '@/services/auth.service.client';
import { formatDate } from '@/utils/format';

/** Best-effort device name from a user agent: "Chrome · Windows", "Expo · iPhone". */
function describeAgent(ua?: string | null): { name: string | null; mobile: boolean } {
  if (!ua) return { name: null, mobile: false };
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : null;
  const app = /Expo/.test(ua) ? 'App' : /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : null;
  const name = [app, os].filter(Boolean).join(' · ') || null;
  return { name, mobile: os === 'iOS' || os === 'Android' };
}

function SessionRow({ item, last, onRevoke }: { item: Session; last: boolean; onRevoke: () => void }) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const { name, mobile } = describeAgent(item.userAgent);
  const device = name ?? t('SESSIONS.UNKNOWN_DEVICE');
  return (
    <View className={`flex-row items-center gap-3 py-3 ${last ? '' : 'border-b border-border'}`}>
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-surface-overlay" accessible={false}>
        <FontAwesomeIcon icon={mobile ? faMobileScreen : name ? faLaptop : faDesktop} size={15} color={tokens['text-secondary']} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>
          {device}
        </Text>
        <Text className="text-xs text-text-secondary" numberOfLines={1}>
          {t('SESSIONS.STARTED', { ip: item.ipAddress ?? t('SESSIONS.UNKNOWN_IP'), date: formatDate(item.createdAt) })}
        </Text>
      </View>
      <Button size="sm" variant="outline" onPress={onRevoke} accessibilityLabel={`${t('SESSIONS.REVOKE')}: ${device}`} testID={`account-sessions-revoke-${item.userSessionId}`}>
        <Text className="text-xs font-medium text-error">{t('SESSIONS.REVOKE')}</Text>
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

  const load = useCallback(async () => {
    try {
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
          sessions.map((s, i) => <SessionRow key={s.userSessionId} item={s} last={i === sessions.length - 1} onRevoke={() => setTarget(s)} />)
        )}
      </Card>
      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        title={t('SESSIONS.REVOKE_TITLE')}
        description={t('SESSIONS.REVOKE_DESC', { device: describeAgent(target?.userAgent).name ?? t('SESSIONS.UNKNOWN_DEVICE') })}
        confirmLabel={t('SESSIONS.REVOKE')}
        onConfirm={() => (target ? revoke(target) : undefined)}
      />
    </>
  );
}
