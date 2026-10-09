import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { Avatar, Button, Progress } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { pickAvatarImage, type ImageSource } from '@/libs/pickImage';
import { IMAGE_MIME_TYPES, checkUpload } from '@/libs/upload';
import { StorageClientService } from '@/services/platform/storage.service.client';

type Props = {
  name: string;
  src?: string | null;
  /** Called with the stored file's URL once the upload finished. */
  onUploaded: (url: string) => void;
};

/** Avatar with "take photo / choose photo": crops, compresses, uploads, reports the URL. */
export function AvatarPicker({ name, src, onUploaded }: Props) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const uploading = progress !== null;

  async function run(source: ImageSource) {
    const picked = await pickAvatarImage(source);
    if (picked.status === 'denied') return toast.error(t('UPLOAD.PERMISSION_DENIED'));
    if (picked.status === 'cancelled') return;

    const rejection = checkUpload(picked.file, { mimeTypes: IMAGE_MIME_TYPES });
    if (rejection) return toast.error(t(`UPLOAD.REJECTED_${rejection}`));

    const controller = new AbortController();
    abort.current = controller;
    setProgress(0);
    try {
      const stored = await StorageClientService.upload(picked.file, { folder: 'avatars', signal: controller.signal, onProgress: (f) => setProgress(f) });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUploaded(stored.url);
    } catch (err: unknown) {
      if (controller.signal.aborted) return; // user cancelled: nothing was stored on the client
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'AvatarPicker.upload');
    } finally {
      abort.current = null;
      setProgress(null);
    }
  }

  return (
    <View className="items-center gap-3 py-2">
      <Avatar name={name} src={src ?? undefined} size="xl" />
      {uploading ? (
        <View className="w-full max-w-xs gap-2">
          <Progress value={(progress ?? 0) * 100} showLabel label={t('UPLOAD.UPLOADING')} />
          <Button variant="outline" size="sm" onPress={() => abort.current?.abort()} testID="avatar-cancel">
            {t('COMMON.CANCEL')}
          </Button>
        </View>
      ) : (
        <View className="flex-row gap-2">
          <Button variant="outline" size="sm" onPress={() => void run('camera')} testID="avatar-camera">
            {t('UPLOAD.TAKE_PHOTO')}
          </Button>
          <Button variant="outline" size="sm" onPress={() => void run('library')} testID="avatar-library">
            {t('UPLOAD.CHOOSE_PHOTO')}
          </Button>
        </View>
      )}
    </View>
  );
}
