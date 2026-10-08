import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { NoOrganization } from '@/components/tenant/NoOrganization';
import { Button, Card, Select, Text, Toggle } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { LOCALE_META, SUPPORTED_LOCALES } from '@/libs/i18n';
import { TenantClientService } from '@/services/tenant/tenant.service.client';
import { useTenantStore } from '@/stores/tenantStore';
import {
  changedSettings,
  DEFAULT_MEMBER_ROLES,
  pickSettings,
  TENANT_SETTING_DEFAULTS,
  TENANT_SETTING_KEYS,
  type TenantSettingsDraft,
} from '@/utils/tenantSettings';

export default function TenantSettingsScreen() {
  const { t } = useTranslation();
  const membership = useTenantStore((s) => s.selectedTenantMembership);
  const tenantId = membership?.tenantId;
  // The settings routes are admin-only on the server; others get a read-only note and no request.
  const canEdit = membership?.memberRole === 'OWNER' || membership?.memberRole === 'ADMIN';

  const [saved, setSaved] = useState<TenantSettingsDraft>(TENANT_SETTING_DEFAULTS);
  const [draft, setDraft] = useState<TenantSettingsDraft>(TENANT_SETTING_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId || !canEdit) return;
    try {
      const next = pickSettings(await TenantClientService.getTenantSettings(tenantId));
      setSaved(next);
      setDraft(next);
    } catch (err: unknown) {
      handleApiError(err, 'TenantSettingsScreen.load');
    }
  }, [tenantId, canEdit]);

  // Reload when the active organization changes (the drawer keeps this screen mounted).
  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const diff = changedSettings(saved, draft);
  const dirty = Object.keys(diff).length > 0;

  async function save() {
    if (!tenantId || !dirty) return;
    setSaving(true);
    try {
      const res = await TenantClientService.saveTenantSettings(tenantId, diff);
      const next = { ...saved };
      for (const key of TENANT_SETTING_KEYS) if (key in res.settings) next[key] = res.settings[key];
      // Keys parked for approval were not written: show the value that is actually in force.
      setSaved(next);
      setDraft(next);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (res.pending.length > 0) toast.info(t('TENANT_SETTINGS.PENDING', { count: res.pending.length }));
      if (Object.keys(res.settings).length > 0 || res.pending.length === 0) toast.success(t('TENANT_SETTINGS.SAVED'));
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'TenantSettingsScreen.save');
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <ScreenHeader
      back={{ label: t('ORGANIZATION.TITLE'), href: '/settings/tenant' }}
      title={t('TENANT_SETTINGS.TITLE')}
      subtitle={t('TENANT_SETTINGS.SUBTITLE')}
    />
  );

  if (!membership) {
    return (
      <Screen>
        {header}
        <NoOrganization />
      </Screen>
    );
  }

  if (!canEdit) {
    return (
      <Screen>
        {header}
        <Text className="px-1 text-sm text-text-secondary">{t('TENANT_SETTINGS.READ_ONLY')}</Text>
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {header}

      <Card title={t('TENANT_SETTINGS.MEMBERSHIP_CARD')} loading={loading}>
        <View className="gap-4 py-2">
          <Select
            id="tenant-settings-role"
            label={t('TENANT_SETTINGS.ROLE_LABEL')}
            value={draft.defaultMemberRole}
            onChange={(v) => setDraft((d) => ({ ...d, defaultMemberRole: v }))}
            options={DEFAULT_MEMBER_ROLES.map((r) => ({ value: r, label: t(`ROLES.${r}`) }))}
          />
          <Text className="-mt-2 text-xs text-text-secondary">{t('TENANT_SETTINGS.ROLE_DESC')}</Text>
          <Toggle
            checked={draft.tenantMemberDualControl === 'true'}
            onChange={(on) => setDraft((d) => ({ ...d, tenantMemberDualControl: on ? 'true' : 'false' }))}
            label={t('TENANT_SETTINGS.DUAL_LABEL')}
            description={t('TENANT_SETTINGS.DUAL_DESC')}
          />
        </View>
      </Card>

      <Card title={t('TENANT_SETTINGS.LANGUAGE_CARD')} loading={loading}>
        <View className="gap-2 py-2">
          <Select
            id="tenant-settings-language"
            label={t('TENANT_SETTINGS.LANGUAGE_LABEL')}
            value={draft.defaultLanguage}
            onChange={(v) => setDraft((d) => ({ ...d, defaultLanguage: v }))}
            options={SUPPORTED_LOCALES.map((l) => ({ value: l, label: `${LOCALE_META[l].flag} ${LOCALE_META[l].name}` }))}
          />
          <Text className="text-xs text-text-secondary">{t('TENANT_SETTINGS.LANGUAGE_DESC')}</Text>
        </View>
      </Card>

      <Button loading={saving} disabled={!dirty || loading} onPress={save} testID="tenant-settings-save">
        {t('TENANT_SETTINGS.SAVE')}
      </Button>
    </Screen>
  );
}
