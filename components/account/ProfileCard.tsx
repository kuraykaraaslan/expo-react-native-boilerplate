import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Avatar, Button, Card, DropdownMenu, Input, Textarea } from '@/components/ui';
import type { UpdateProfileRequest } from '@/modules/user/profile.dto';
import { pickAndUploadAvatar, type AvatarSource } from '@/libs/avatar';
import { handleApiError } from '@/libs/errorUtils';
import { ProfileClientService } from '@/modules/user/profile.service.client';
import { useAuthStore } from '@/stores/authStore';
import { getUserDisplayName } from '@/utils/user';

const EMPTY: UpdateProfileRequest = { name: null, biography: null, profilePicture: null, headerImage: null, socialLinks: [] };

/** next-boilerplate "Profil bilgileri" card: avatar, display name, bio, save. */
export function ProfileCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<UpdateProfileRequest>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ProfileClientService.getProfile()
      .then((p) => {
        if (!cancelled && p) {
          setForm({
            name: p.name ?? null,
            biography: p.biography ?? null,
            profilePicture: p.profilePicture ?? null,
            headerImage: p.headerImage ?? null,
            socialLinks: p.socialLinks ?? [],
          });
        }
      })
      .catch((err: unknown) => handleApiError(err, 'ProfileCard.load'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      await ProfileClientService.updateProfile(form);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t('account.me.profileSaved'));
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'ProfileCard.save');
    } finally {
      setSaving(false);
    }
  }

  async function changePhoto(source: AvatarSource) {
    setUploading(true);
    try {
      const result = await pickAndUploadAvatar(source);
      if (result.status === 'ok') {
        setForm((f) => ({ ...f, profilePicture: result.url }));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(t('account.me.photoUploaded'));
      } else if (result.status === 'denied') {
        toast.error(t('account.me.photoDenied'));
      } else if (result.status === 'invalid') {
        toast.error(t(result.reason === 'TOO_LARGE' ? 'account.me.photoTooLarge' : 'account.me.photoNotImage'));
      }
    } catch (err: unknown) {
      handleApiError(err, 'ProfileCard.photo');
    } finally {
      setUploading(false);
    }
  }

  const displayName = form.name || getUserDisplayName(user) || '?';

  return (
    <Card
      title={t('account.me.profileCard')}
      subtitle={t('account.me.profileCardSubtitle')}
      loading={loading}
      footer={
        <View className="flex-row justify-end">
          <Button loading={saving} onPress={save} testID="account-profile-save">
            {saving ? t('common.actions.saving') : t('account.me.saveProfile')}
          </Button>
        </View>
      }
    >
      <View className="gap-4">
        <View className="items-center py-2">
          <Avatar name={displayName} src={form.profilePicture ?? undefined} size="xl" />
          <View className="mt-3">
            <DropdownMenu
              align="left"
              trigger={
                <Button variant="outline" size="sm" loading={uploading} disabled={uploading} testID="account-photo-change">
                  {uploading ? t('account.me.photoUploading') : t('account.me.photoChange')}
                </Button>
              }
              items={[
                { label: t('account.me.photoTake'), onPress: () => changePhoto('camera') },
                { label: t('account.me.photoChoose'), onPress: () => changePhoto('library') },
                ...(form.profilePicture
                  ? [{ label: t('account.me.photoRemove'), danger: true, onPress: () => setForm((f) => ({ ...f, profilePicture: null })) }]
                  : []),
              ]}
            />
          </View>
        </View>
        <Input
          label={t('account.me.displayName')}
          value={form.name ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v || null }))}
          autoComplete="name"
          testID="account-profile-name"
        />
        <Textarea
          label={t('account.me.bio')}
          rows={3}
          value={form.biography ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, biography: v || null }))}
          testID="account-profile-bio"
        />
      </View>
    </Card>
  );
}
