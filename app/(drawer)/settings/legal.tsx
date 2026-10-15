import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { toast } from 'sonner-native';
import { faFileContract, faUserShield } from '@fortawesome/free-solid-svg-icons';
import { LinkTile } from '@/components/common/LinkTile';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Button, Card, Text, Toggle } from '@/components/ui';
import { env } from '@/libs/env';
import { handleApiError } from '@/libs/errorUtils';
import type { ConsentConfig } from '@/modules/compliance/compliance.dto';
import { ComplianceClientService } from '@/modules/compliance/compliance.service.client';
import { TenantClientService } from '@/modules/tenant/tenant.service.client';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';
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
  const userId = useAuthStore((s) => s.user?.userId);
  const tenantId = useTenantStore((s) => s.activeTenantId);

  const [policies, setPolicies] = useState<{ privacy: string | null; terms: string | null }>({ privacy: null, terms: null });
  const [config, setConfig] = useState<ConsentConfig | null>(null);
  const [saved, setSaved] = useState<Choices>({});
  const [draft, setDraft] = useState<Choices>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    // Independent reads: a tenant without consent configured must not hide the policy links, and vice versa.
    const [brand, cfg] = await Promise.allSettled([
      TenantClientService.getPublicBranding(),
      ComplianceClientService.getConsentConfig(),
    ]);
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
        const next = initialChoices(cfg.value, await ComplianceClientService.getConsentState(userId));
        setSaved(next);
        setDraft(next);
      } catch (err: unknown) {
        handleApiError(err, 'LegalScreen.consentState');
      }
    } else {
      handleApiError(cfg.reason, 'LegalScreen.consentConfig');
    }
  }, [userId]);

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
    if (!config || !userId || !dirty) return;
    setSaving(true);
    try {
      await ComplianceClientService.recordConsent({
        userId,
        policyVersion: config.policyVersion || undefined,
        decisions: optional.map((p) => ({ purpose: p.key, granted: draft[p.key] ?? false })),
      });
      setSaved(draft);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('privacy.center.saved'));
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
      <ScreenHeader back={{ label: t('account.settingsHub.title'), href: '/settings' }} title={t('privacy.center.title')} subtitle={t('privacy.center.subtitle')} />

      <Card title={t('privacy.center.policiesCard')} loading={loading}>
        {hasPolicies ? (
          <View className="gap-3 py-2">
            {policies.privacy ? (
              <LinkTile icon={faUserShield} title={t('privacy.center.privacyPolicy')} onPress={() => open(policies.privacy!)} testID="legal-privacy-policy" />
            ) : null}
            {policies.terms ? (
              <LinkTile icon={faFileContract} title={t('privacy.center.terms')} onPress={() => open(policies.terms!)} testID="legal-terms" />
            ) : null}
          </View>
        ) : (
          <Text className="py-3 text-sm text-text-secondary">{t('privacy.center.noPolicies')}</Text>
        )}
      </Card>

      <Card title={t('privacy.center.choicesCard')} subtitle={t('privacy.center.choicesDesc')} loading={loading}>
        {config?.enabled && config.purposes.length > 0 ? (
          <View className="gap-4 py-2">
            {config.purposes.map((p) => (
              <Toggle
                key={p.key}
                checked={draft[p.key] ?? false}
                onChange={(on) => setDraft((d) => ({ ...d, [p.key]: on }))}
                label={p.label || p.key}
                description={p.required ? `${p.description ? `${p.description} · ` : ''}${t('privacy.center.required')}` : p.description || undefined}
                disabled={p.required}
              />
            ))}
            <Button loading={saving} disabled={!dirty} onPress={save} testID="legal-consent-save">
              {t('privacy.center.save')}
            </Button>
          </View>
        ) : (
          <Text className="py-3 text-sm text-text-secondary">{t('privacy.center.choicesOff')}</Text>
        )}
      </Card>
    </Screen>
  );
}
