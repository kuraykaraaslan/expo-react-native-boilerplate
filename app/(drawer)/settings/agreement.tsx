import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Badge, Button, Card, Spinner, Text } from '@/components/ui';
import { normalizeApiError } from '@/libs/apiError';
import { handleApiError } from '@/libs/errorUtils';
import { refreshPendingAgreements, usePendingAgreements } from '@/libs/pendingAgreements';
import type { CurrentAgreement } from '@/services/compliance/compliance.dto';
import { ComplianceClientService } from '@/services/compliance/compliance.service.client';
import { useAuthStore } from '@/stores/authStore';
import { useComplianceStore } from '@/stores/complianceStore';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { formatDate } from '@/utils/format';

/**
 * Agreement reader (`?type=`): shows the CURRENT published text of one agreement
 * and, when it is pending for the user, accepts it. The text is rendered as plain
 * text, never as HTML. Acceptance is for the session user (no userId is sent); the
 * server stamps whichever version is current at that moment, so a different version
 * in the answer means the text changed under the reader and is shown again.
 */
export default function AgreementScreen() {
  const { t } = useTranslation();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const pending = usePendingAgreements();

  const [doc, setDoc] = useState<CurrentAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [justAccepted, setJustAccepted] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    const tenantAtStart = getActiveTenantId();
    if (!signedIn || !type) {
      setLoading(false);
      setUnavailable(true);
      return;
    }
    setLoading(true);
    setUnavailable(false);
    try {
      const next = await ComplianceClientService.getCurrentAgreement(type);
      if (mine !== seq.current || getActiveTenantId() !== tenantAtStart) return;
      setDoc(next);
    } catch (err: unknown) {
      if (mine !== seq.current || getActiveTenantId() !== tenantAtStart) return;
      setDoc(null);
      const { statusCode } = normalizeApiError(err);
      if (statusCode === 404 || statusCode === 409) setUnavailable(true); // not defined / nothing published yet
      else handleApiError(err, 'AgreementScreen.load');
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [signedIn, type]);

  // A new organization is a different set of documents; a stale one must not stay on screen.
  useEffect(() => {
    setDoc(null);
    setJustAccepted(false);
    void load();
    return () => {
      seq.current += 1; // leaving the screen drops any answer still in flight
    };
  }, [load, tenantId]);

  const entry = doc ? pending.find((p) => p.agreementId === doc.agreement.agreementId) : undefined;
  const needsAcceptance = Boolean(entry) && !justAccepted;

  async function accept() {
    if (!doc || accepting) return;
    const tenantAtStart = getActiveTenantId();
    const shown = doc;
    setAccepting(true);
    try {
      const { acceptance } = await ComplianceClientService.acceptAgreement({ agreementId: shown.agreement.agreementId, accepted: true });
      if (getActiveTenantId() !== tenantAtStart) return; // switched away: the acceptance belongs to the old organization
      if (acceptance.versionId && acceptance.versionId !== shown.version.versionId) {
        // Published between loading and accepting: what was recorded is not what the user read.
        toast.info(t('AGREEMENTS.CHANGED'));
        await load();
        void refreshPendingAgreements();
        return;
      }
      useComplianceStore.getState().resolve(tenantAtStart, shown.agreement.agreementId);
      setJustAccepted(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('AGREEMENTS.ACCEPTED_TOAST'));
      void refreshPendingAgreements();
      if (router.canGoBack()) router.back();
      else router.replace('/settings/legal');
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'AgreementScreen.accept');
    } finally {
      setAccepting(false);
    }
  }

  const published = formatDate(doc?.version.publishedAt);

  return (
    <Screen>
      <ScreenHeader
        back={{ label: t('PRIVACY.TITLE'), href: '/settings/legal' }}
        title={doc?.agreement.title ?? t('AGREEMENTS.READER_TITLE')}
        subtitle={doc ? [t('AGREEMENTS.VERSION', { version: doc.version.version }), published ? t('AGREEMENTS.PUBLISHED', { date: published }) : null].filter(Boolean).join(' · ') : undefined}
      />

      {loading && !doc ? (
        <View className="items-center py-10">
          <Spinner />
        </View>
      ) : null}

      {!loading && unavailable ? (
        <Card>
          <Text className="py-3 text-sm text-text-secondary" testID="agreement-unavailable">
            {t('AGREEMENTS.NOT_AVAILABLE')}
          </Text>
        </Card>
      ) : null}

      {doc ? (
        <>
          <Card
            headerRight={
              needsAcceptance ? (
                <Badge variant="warning">{t('AGREEMENTS.NEEDS_ACCEPTANCE')}</Badge>
              ) : doc.agreement.requiresAcceptance ? (
                <Badge variant="success">{t('AGREEMENTS.ACCEPTED')}</Badge>
              ) : undefined
            }
          >
            {/* Plain text only: the legal text is never interpreted as HTML or markup. */}
            <Text selectable className="py-2 text-sm leading-6 text-text-primary" testID="agreement-content">
              {doc.version.content}
            </Text>
          </Card>

          {needsAcceptance ? (
            <Button loading={accepting} onPress={accept} testID="agreement-accept">
              {t('AGREEMENTS.ACCEPT')}
            </Button>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
