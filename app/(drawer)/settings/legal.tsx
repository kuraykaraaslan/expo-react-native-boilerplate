import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { toast } from 'sonner-native';
import { faFileContract, faFileSignature, faUserShield } from '@fortawesome/free-solid-svg-icons';
import { PendingAgreementsBanner } from '@/components/compliance/PendingAgreementsBanner';
import { LinkTile } from '@/components/common/LinkTile';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Button, Card, Text, Toggle } from '@/components/ui';
import logger from '@/libs/logger';
import { env } from '@/libs/env';
import { normalizeApiError } from '@/libs/apiError';
import { handleApiError } from '@/libs/errorUtils';
import { refreshPendingAgreements, usePendingAgreements } from '@/libs/pendingAgreements';
import type { ConsentConfig, CurrentAgreement } from '@/services/compliance/compliance.dto';
import { ComplianceClientService } from '@/services/compliance/compliance.service.client';
import { TenantClientService } from '@/services/tenant/tenant.service.client';
import { useAuthStore } from '@/stores/authStore';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { safeWebUrl } from '@/utils/notification';

type Choices = Record<string, boolean>;

/** What each purpose shows as: required ones are always on; the rest default to off until the user answers. */
function initialChoices(config: ConsentConfig, state: Choices): Choices {
  const out: Choices = {};
  for (const p of config.purposes) out[p.key] = p.required ? true : (state[p.key] ?? false);
  return out;
}

export default function LegalScreen() {
  const { t } = useTranslation();
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const pending = usePendingAgreements();
  const tenantId = useTenantStore((s) => s.activeTenantId);

  const [policies, setPolicies] = useState<{ privacy: string | null; terms: string | null }>({ privacy: null, terms: null });
  const [agreements, setAgreements] = useState<CurrentAgreement[]>([]);
  const [config, setConfig] = useState<ConsentConfig | null>(null);
  const [saved, setSaved] = useState<Choices>({});
  const [draft, setDraft] = useState<Choices>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) return;
    const tenantAtStart = getActiveTenantId();
    // Independent reads: a tenant without consent configured must not hide the policy links, and vice versa.
    const [brand, cfg, docs] = await Promise.allSettled([
      TenantClientService.getPublicBranding(),
      ComplianceClientService.getConsentConfig(),
      ComplianceClientService.getCurrentAgreements(),
    ]);
    if (getActiveTenantId() !== tenantAtStart) return; // the organization changed while these were in flight
    if (docs.status === 'fulfilled') setAgreements(docs.value);
    else {
      setAgreements([]);
      logger.warn('[LegalScreen] agreements', normalizeApiError(docs.reason).statusCode ?? 'no response');
    }
    void refreshPendingAgreements(); // the banner and the badges below read the store
    if (brand.status === 'fulfilled') {
      const s = brand.value.settings;
      setPolicies({
        privacy: safeWebUrl(s.privacyPolicyUrl, env.EXPO_PUBLIC_FRONTEND_URL),
        terms: safeWebUrl(s.termsOfServiceUrl, env.EXPO_PUBLIC_FRONTEND_URL),
      });
    }
    if (cfg.status === 'fulfilled') {
      setConfig(cfg.value);
      try {
        const next = initialChoices(cfg.value, await ComplianceClientService.getConsentState());
        if (getActiveTenantId() !== tenantAtStart) return;
        setSaved(next);
        setDraft(next);
      } catch (err: unknown) {
        handleApiError(err, 'LegalScreen.consentState');
      }
    } else {
      handleApiError(cfg.reason, 'LegalScreen.consentConfig');
    }
  }, [signedIn]);

  // Reload when the active organization changes (the drawer keeps this screen mounted).
  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, tenantId]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const optional = config?.purposes.filter((p) => !p.required) ?? [];
  const dirty = optional.some((p) => draft[p.key] !== saved[p.key]);

  async function save() {
    if (!config || !signedIn || !dirty) return;
    const tenantAtStart = getActiveTenantId();
    setSaving(true);
    try {
      await ComplianceClientService.recordConsent({
        policyVersion: config.policyVersion || undefined,
        decisions: optional.map((p) => ({ purpose: p.key, granted: draft[p.key] ?? false })),
      });
      if (getActiveTenantId() !== tenantAtStart) return; // the choices belong to the organization that was shown
      setSaved(draft);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('PRIVACY.SAVED'));
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'LegalScreen.save');
    } finally {
      setSaving(false);
    }
  }

  const open = (url: string) => void WebBrowser.openBrowserAsync(url).catch(() => undefined);
  const hasPolicies = policies.privacy !== null || policies.terms !== null;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ScreenHeader back={{ label: t('SETTINGS_HUB.TITLE'), href: '/settings' }} title={t('PRIVACY.TITLE')} subtitle={t('PRIVACY.SUBTITLE')} />

      <PendingAgreementsBanner testID="legal-pending-banner" />

      <Card title={t('AGREEMENTS.CARD')} subtitle={t('AGREEMENTS.CARD_DESC')} loading={loading}>
        {agreements.length > 0 ? (
          <View className="gap-3 py-2">
            {agreements.map(({ agreement, version }) => {
              const isPending = pending.some((p) => p.agreementId === agreement.agreementId);
              const status = isPending ? t('AGREEMENTS.NEEDS_ACCEPTANCE') : agreement.requiresAcceptance ? t('AGREEMENTS.ACCEPTED') : null;
              return (
                <LinkTile
                  key={agreement.agreementId}
                  icon={faFileSignature}
                  title={agreement.title}
                  description={[t('AGREEMENTS.VERSION', { version: version.version }), status].filter(Boolean).join(' · ')}
                  href={{ pathname: '/settings/agreement', params: { type: agreement.type } }}
                  testID={`legal-agreement-${agreement.agreementId}`}
                />
              );
            })}
          </View>
        ) : (
          <Text className="py-3 text-sm text-text-secondary">{t('AGREEMENTS.NONE')}</Text>
        )}
      </Card>

      <Card title={t('PRIVACY.POLICIES_CARD')} loading={loading}>
        {hasPolicies ? (
          <View className="gap-3 py-2">
            {policies.privacy ? (
              <LinkTile icon={faUserShield} title={t('PRIVACY.PRIVACY_POLICY')} onPress={() => open(policies.privacy!)} testID="legal-privacy-policy" />
            ) : null}
            {policies.terms ? (
              <LinkTile icon={faFileContract} title={t('PRIVACY.TERMS')} onPress={() => open(policies.terms!)} testID="legal-terms" />
            ) : null}
          </View>
        ) : (
          <Text className="py-3 text-sm text-text-secondary">{t('PRIVACY.NO_POLICIES')}</Text>
        )}
      </Card>

      <Card title={t('PRIVACY.CHOICES_CARD')} subtitle={t('PRIVACY.CHOICES_DESC')} loading={loading}>
        {config?.enabled && config.purposes.length > 0 ? (
          <View className="gap-4 py-2">
            {config.purposes.map((p) => (
              <Toggle
                key={p.key}
                checked={draft[p.key] ?? false}
                onChange={(on) => setDraft((d) => ({ ...d, [p.key]: on }))}
                label={p.label || p.key}
                description={p.required ? `${p.description ? `${p.description} · ` : ''}${t('PRIVACY.REQUIRED')}` : p.description || undefined}
                disabled={p.required}
              />
            ))}
            <Button loading={saving} disabled={!dirty} onPress={save} testID="legal-consent-save">
              {t('PRIVACY.SAVE')}
            </Button>
          </View>
        ) : (
          <Text className="py-3 text-sm text-text-secondary">{t('PRIVACY.CHOICES_OFF')}</Text>
        )}
      </Card>
    </Screen>
  );
}
