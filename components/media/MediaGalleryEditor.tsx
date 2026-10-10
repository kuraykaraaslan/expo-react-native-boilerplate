import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faArrowRight, faStar, faTrash } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner-native';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Badge, Button, Progress, Spinner, Text } from '@/components/ui';
import { handleApiError } from '@/libs/errorUtils';
import { pickImage, type ImageSource } from '@/libs/pickImage';
import { IMAGE_MIME_TYPES, checkUpload } from '@/libs/upload';
import { MediaGalleryClientService } from '@/services/platform/mediaGallery.service.client';
import type { Gallery, GalleryItem } from '@/services/platform/mediaGallery.dto';
import { StorageClientService } from '@/services/platform/storage.service.client';
import { getActiveTenantId, useTenantStore } from '@/stores/tenantStore';
import { cn } from '@/utils/cn';
import { canMove, moveItem, sortGalleryItems, withPositions, withPrimary } from '@/utils/mediaGallery';

type Props = {
  /** Open slug the server groups galleries by, e.g. "blog_post". */
  entityType: string;
  entityId: string;
  /** Viewing only: no add, reorder, primary or delete controls. */
  readOnly?: boolean;
  className?: string;
};

const GALLERY_WIDTH_PX = 1600;
const UPLOAD_FOLDER = 'images';

const feedback = (type: Haptics.NotificationFeedbackType) => void Haptics.notificationAsync(type).catch(() => undefined); // feedback only: never fail an action

/**
 * Photos attached to one entity: add (camera or library), reorder, pick the
 * primary photo and delete. Controls act on the server and the list follows its
 * answer; an answer that arrives after the organization or the entity changed is dropped.
 */
export function MediaGalleryEditor({ entityType, entityId, readOnly = false, className }: Props) {
  const { t } = useTranslation();
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<GalleryItem | null>(null);
  const abort = useRef<AbortController | null>(null);
  const working = useRef(false); // one add / reorder / primary / delete at a time
  const scope = useRef('');
  const uploading = progress !== null;

  // The scope a mutation started in; its answer is only applied while this is still the live one.
  scope.current = `${tenantId}|${entityType}|${entityId}`;
  const isLive = (started: string) => scope.current === started;
  const currentScope = () => `${getActiveTenantId()}|${entityType}|${entityId}`;

  const load = useCallback(async () => {
    const started = currentScope();
    setLoading(true);
    setFailed(false);
    try {
      const next = await MediaGalleryClientService.list(entityType, entityId);
      if (scope.current !== started) return;
      setGallery(next);
      setItems(sortGalleryItems(next.items));
    } catch (err: unknown) {
      if (scope.current !== started) return;
      setFailed(true);
      handleApiError(err, 'MediaGalleryEditor.load');
    } finally {
      if (scope.current === started) setLoading(false);
    }
  }, [entityType, entityId]);

  // A different organization's (or entity's) photos must never show under this one.
  useEffect(() => {
    abort.current?.abort();
    setGallery(null);
    setItems([]);
    setProgress(null);
    setBusyId(null);
    setToDelete(null);
    working.current = false;
    void load();
  }, [tenantId, entityType, entityId, load]);

  // Leaving the screen cancels a running upload.
  useEffect(() => () => abort.current?.abort(), []);

  /** Runs one mutation; the list is reloaded from the server when it fails. */
  async function mutate(itemId: string | null, action: (started: string) => Promise<void>, context: string) {
    if (working.current) return;
    working.current = true;
    const started = currentScope();
    setBusyId(itemId);
    try {
      await action(started);
    } catch (err: unknown) {
      if (!isLive(started)) return;
      feedback(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, context);
      void load(); // the local copy may no longer match the server
    } finally {
      if (isLive(started)) {
        working.current = false;
        setBusyId(null);
      }
    }
  }

  async function add(source: ImageSource) {
    if (working.current || uploading) return;
    working.current = true; // held across the picker so a second tap cannot open another one
    const started = currentScope();
    const controller = new AbortController();
    try {
      const picked = await pickImage(source, { crop: false, widthPx: GALLERY_WIDTH_PX, namePrefix: 'gallery' });
      if (picked.status === 'denied') return void toast.error(t('UPLOAD.PERMISSION_DENIED'));
      if (picked.status === 'cancelled' || !isLive(started)) return;

      const rejection = checkUpload(picked.file, { mimeTypes: IMAGE_MIME_TYPES });
      if (rejection) return void toast.error(t(`UPLOAD.REJECTED_${rejection}`));

      abort.current = controller;
      setProgress(0);
      const stored = await StorageClientService.upload(picked.file, { folder: UPLOAD_FOLDER, signal: controller.signal, onProgress: (f) => setProgress(f) });
      if (!isLive(started)) return;
      if (!stored.uploadedFileId) throw new Error('Upload answered without an uploadedFileId');
      const item = await MediaGalleryClientService.addItem(entityType, entityId, { uploadedFileId: stored.uploadedFileId, sortOrder: items.length });
      if (!isLive(started)) return;
      setItems((prev) => sortGalleryItems([...prev, item]));
      feedback(Haptics.NotificationFeedbackType.Success);
      toast.success(t('MEDIA_GALLERY.ADDED'));
    } catch (err: unknown) {
      if (controller.signal.aborted || !isLive(started)) return; // cancelled by the user or by leaving
      feedback(Haptics.NotificationFeedbackType.Error);
      handleApiError(err, 'MediaGalleryEditor.add');
    } finally {
      if (isLive(started)) {
        working.current = false;
        setProgress(null);
      }
      if (abort.current === controller) abort.current = null;
    }
  }

  function move(item: GalleryItem, direction: -1 | 1) {
    if (!gallery) return;
    const next = withPositions(moveItem(items, item.itemId, direction));
    if (!canMove(items, item.itemId, direction)) return;
    void mutate(
      item.itemId,
      async () => {
        const previous = items;
        setItems(next); // shown at once; put back if the server refuses
        try {
          await MediaGalleryClientService.reorder(entityType, entityId, gallery.galleryId, next.map((i) => i.itemId));
        } catch (err: unknown) {
          setItems(previous);
          throw err;
        }
        void Haptics.selectionAsync().catch(() => undefined);
      },
      'MediaGalleryEditor.reorder',
    );
  }

  function makePrimary(item: GalleryItem) {
    if (item.isPrimary) return;
    void mutate(
      item.itemId,
      async (started) => {
        await MediaGalleryClientService.setPrimary(item.itemId);
        if (!isLive(started)) return;
        setItems((prev) => withPrimary(prev, item.itemId));
        feedback(Haptics.NotificationFeedbackType.Success);
        toast.success(t('MEDIA_GALLERY.PRIMARY_SET'));
      },
      'MediaGalleryEditor.primary',
    );
  }

  function remove(item: GalleryItem) {
    return mutate(
      item.itemId,
      async (started) => {
        await MediaGalleryClientService.removeItem(item.itemId);
        if (!isLive(started)) return;
        setItems((prev) => prev.filter((i) => i.itemId !== item.itemId));
        feedback(Haptics.NotificationFeedbackType.Success);
        toast.success(t('MEDIA_GALLERY.REMOVED'));
      },
      'MediaGalleryEditor.remove',
    );
  }

  if (loading && !gallery) {
    return (
      <View className={cn('items-center py-6', className)}>
        <Spinner />
      </View>
    );
  }

  if (failed && !gallery) {
    return (
      <View className={cn('items-center gap-3 py-6', className)}>
        <Text className="text-text-secondary">{t('MEDIA_GALLERY.LOAD_FAILED')}</Text>
        <Button variant="outline" size="sm" onPress={() => void load()} testID="gallery-retry">
          {t('COMMON.RETRY')}
        </Button>
      </View>
    );
  }

  const locked = busyId !== null || uploading;

  return (
    <View className={cn('gap-3', className)}>
      {items.length === 0 ? (
        <View className="items-center py-6">
          <Text className="font-semibold text-text-primary">{t('MEDIA_GALLERY.EMPTY')}</Text>
          {!readOnly && <Text className="mt-1 text-center text-text-secondary">{t('MEDIA_GALLERY.EMPTY_DESC')}</Text>}
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {items.map((item) => (
            <View key={item.itemId} className="w-[47%] overflow-hidden rounded-lg border border-border bg-surface" testID={`gallery-item-${item.itemId}`}>
              <View className="aspect-square bg-surface-overlay">
                {item.isVideo ? (
                  <View className="flex-1 items-center justify-center p-2">
                    <Text className="text-center text-text-secondary">{item.title || t('MEDIA_GALLERY.VIDEO')}</Text>
                  </View>
                ) : (
                  <Image source={{ uri: item.url }} accessibilityLabel={item.altText || item.title || undefined} contentFit="cover" style={{ flex: 1 }} />
                )}
                {item.isPrimary && (
                  <View className="absolute left-2 top-2">
                    <Badge variant="primary">{t('MEDIA_GALLERY.PRIMARY')}</Badge>
                  </View>
                )}
                {busyId === item.itemId && (
                  <View className="absolute inset-0 items-center justify-center bg-black/30">
                    <Spinner />
                  </View>
                )}
              </View>
              {!readOnly && (
                <View className="flex-row items-center justify-between p-1">
                  <Button variant="ghost" size="sm" disabled={locked || !canMove(items, item.itemId, -1)} onPress={() => move(item, -1)} accessibilityLabel={t('MEDIA_GALLERY.MOVE_EARLIER')} testID={`gallery-earlier-${item.itemId}`}>
                    <FontAwesomeIcon icon={faArrowLeft} size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" disabled={locked || !canMove(items, item.itemId, 1)} onPress={() => move(item, 1)} accessibilityLabel={t('MEDIA_GALLERY.MOVE_LATER')} testID={`gallery-later-${item.itemId}`}>
                    <FontAwesomeIcon icon={faArrowRight} size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" disabled={locked || item.isPrimary} onPress={() => makePrimary(item)} accessibilityLabel={t('MEDIA_GALLERY.SET_PRIMARY')} testID={`gallery-primary-${item.itemId}`}>
                    <FontAwesomeIcon icon={faStar} size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" disabled={locked} onPress={() => setToDelete(item)} accessibilityLabel={t('MEDIA_GALLERY.DELETE')} testID={`gallery-delete-${item.itemId}`}>
                    <FontAwesomeIcon icon={faTrash} size={14} />
                  </Button>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {!readOnly &&
        (uploading ? (
          <View className="w-full gap-2">
            <Progress value={(progress ?? 0) * 100} showLabel label={t('UPLOAD.UPLOADING')} />
            <Button variant="outline" size="sm" onPress={() => abort.current?.abort()} testID="gallery-cancel">
              {t('COMMON.CANCEL')}
            </Button>
          </View>
        ) : (
          <View className="flex-row gap-2">
            <Button variant="outline" size="sm" disabled={locked} onPress={() => void add('camera')} testID="gallery-camera">
              {t('UPLOAD.TAKE_PHOTO')}
            </Button>
            <Button variant="outline" size="sm" disabled={locked} onPress={() => void add('library')} testID="gallery-library">
              {t('UPLOAD.CHOOSE_PHOTO')}
            </Button>
          </View>
        ))}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title={t('MEDIA_GALLERY.DELETE_TITLE')}
        description={t('MEDIA_GALLERY.DELETE_DESC')}
        confirmLabel={t('MEDIA_GALLERY.DELETE')}
        onConfirm={() => (toDelete ? remove(toDelete) : undefined)}
      />
    </View>
  );
}
