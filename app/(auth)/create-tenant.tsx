import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Input, Textarea } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { useThemeTokens } from '@/libs/theme/ThemeContext';
import { TenantClientService } from '@/services/tenant/tenant.service.client';

export default function CreateTenantScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError(t('AUTH_UI.ORG_NAME_INVALID'));
      return;
    }
    setNameError(undefined);
    setSaving(true);
    try {
      await TenantClientService.createTenant({ name: trimmed, description: description.trim() || null });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('AUTH_UI.ORG_CREATED'));
      router.replace('/select-tenant');
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'CreateTenantScreen.create');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthShell
      title={t('AUTH_UI.CREATE_ORG_TITLE')}
      subtitle={t('AUTH_UI.CREATE_ORG_SUBTITLE')}
      icon={faBuilding}
      footer={<AuthFooterLink label={t('AUTH_UI.BACK_TO_ORGS')} href="/select-tenant" testID="auth-create-org-back" />}
    >
      <View className="gap-3">
        <Input
          label={t('AUTH_UI.ORG_NAME')}
          required
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameError(undefined);
          }}
          error={nameError}
          maxLength={100}
          prefixIcon={<FontAwesomeIcon icon={faBuilding} size={14} color={tokens['text-disabled']} />}
          testID="auth-create-org-name"
        />
        <Textarea
          label={t('AUTH_UI.ORG_DESCRIPTION')}
          hint={t('COMMON.OPTIONAL')}
          rows={3}
          value={description}
          onChangeText={setDescription}
          testID="auth-create-org-description"
        />
      </View>
      <Button fullWidth loading={saving} onPress={handleCreate} testID="auth-create-org-submit">
        {saving ? t('AUTH_UI.CREATING_ORG') : t('AUTH_UI.CREATE_ORG')}
      </Button>
    </AuthShell>
  );
}
