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
      toast.success(t('ACCOUNT.PROFILE_SAVED'));
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
        toast.success(t('ACCOUNT.PHOTO_UPLOADED'));
      } else if (result.status === 'denied') {
        toast.error(t('ACCOUNT.PHOTO_DENIED'));
      } else if (result.status === 'invalid') {
        toast.error(t(result.reason === 'TOO_LARGE' ? 'ACCOUNT.PHOTO_TOO_LARGE' : 'ACCOUNT.PHOTO_NOT_IMAGE'));
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
      title={t('ACCOUNT.PROFILE_CARD')}
      subtitle={t('ACCOUNT.PROFILE_CARD_DESC')}
      loading={loading}
      footer={
        <View className="flex-row justify-end">
          <Button loading={saving} onPress={save} testID="account-profile-save">
            {saving ? t('COMMON.SAVING') : t('ACCOUNT.SAVE_PROFILE')}
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
                  {uploading ? t('ACCOUNT.PHOTO_UPLOADING') : t('ACCOUNT.PHOTO_CHANGE')}
                </Button>
              }
              items={[
                { label: t('ACCOUNT.PHOTO_TAKE'), onPress: () => changePhoto('camera') },
                { label: t('ACCOUNT.PHOTO_CHOOSE'), onPress: () => changePhoto('library') },
                ...(form.profilePicture
                  ? [{ label: t('ACCOUNT.PHOTO_REMOVE'), danger: true, onPress: () => setForm((f) => ({ ...f, profilePicture: null })) }]
                  : []),
              ]}
            />
          </View>
        </View>
        <Input
          label={t('ACCOUNT.DISPLAY_NAME')}
          value={form.name ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v || null }))}
          autoComplete="name"
          testID="account-profile-name"
        />
        <Textarea
          label={t('ACCOUNT.BIO')}
          rows={3}
          value={form.biography ?? ''}
          onChangeText={(v) => setForm((f) => ({ ...f, biography: v || null }))}
          testID="account-profile-bio"
        />
      </View>
    </Card>
  );
}
