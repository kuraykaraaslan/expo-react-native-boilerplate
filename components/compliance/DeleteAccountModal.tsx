import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { AlertBanner, Button, Input, Modal, Text } from '@/components/ui';
import { finishAccountDeletion } from '@/libs/accountDeletion';
import { normalizeApiError } from '@/libs/apiError';
import { handleApiError } from '@/libs/errorUtils';
import logger from '@/libs/logger';
import { reauthFailure } from '@/libs/reauth';
import type { DeletionConflictTenant } from '@/services/compliance/compliance.dto';
import { ComplianceClientService } from '@/services/compliance/compliance.service.client';

/** The word the person types to arm the delete button (the same in every language, so any keyboard can type it). */
export const DELETE_CONFIRM_WORD = 'DELETE';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Whether the account has a password to confirm with (null: unknown, so ask and let the server decide). */
  hasPassword: boolean | null;
};

/**
 * Account deletion: consequences, password re-authentication (only for accounts that have one), a typed
 * confirmation, then POST /auth/me/deletion-request. A 409 for the last owner of a shared workspace turns
 * into a list of those workspaces and what to do. On success everything local is wiped without a server
 * logout (the sessions are already gone) and the user lands on login.
 */
export function DeleteAccountModal({ open, onClose, hasPassword }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [askPassword, setAskPassword] = useState(hasPassword !== false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [conflict, setConflict] = useState<DeletionConflictTenant[] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const armed = typed.trim().toUpperCase() === DELETE_CONFIRM_WORD && (!askPassword || password.length > 0);

  async function remove() {
    if (!armed || busy) return;
    setBusy(true);
    setPasswordError(undefined);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      const result = await ComplianceClientService.requestAccountDeletion(askPassword ? password : undefined);
      // The account is gone whatever happened to this screen meanwhile: wipe even if the modal was dismissed.
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await finishAccountDeletion(result);
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (!mounted.current) return;
      const failure = reauthFailure(err);
      const tenants = ComplianceClientService.deletionConflictTenants(err);
      if (failure === 'password-required') {
        setAskPassword(true);
        setPasswordError(t('ACCOUNT_DATA.PASSWORD_REQUIRED'));
      } else if (failure === 'invalid-password') {
        setPasswordError(t('ACCOUNT_DATA.PASSWORD_WRONG'));
      } else if (tenants) {
        setConflict(tenants);
      } else if (normalizeApiError(err).statusCode === 409) {
        // A platform administrator, or a workspace that could not be scheduled: nothing was deleted.
        logger.warn('[DeleteAccountModal] deletion refused (409)');
        setBlocked(true);
      } else {
        handleApiError(err, 'DeleteAccountModal.remove');
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  if (conflict || blocked) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={t('ACCOUNT_DATA.CONFLICT_TITLE')}
        footer={
          <Button variant="outline" onPress={onClose} testID="delete-account-conflict-close">
            {t('COMMON.CLOSE')}
          </Button>
        }
      >
        <View className="gap-3">
          {conflict ? (
            <>
              <Text className="text-sm text-text-secondary">{t('ACCOUNT_DATA.CONFLICT_DESC')}</Text>
              <View className="gap-1" testID="delete-account-conflict-list">
                {conflict.map((tenant) => (
                  <Text key={tenant.tenantId} className="text-sm font-medium text-text-primary">
                    {`• ${tenant.name || tenant.tenantId}`}
                  </Text>
                ))}
              </View>
              <Text className="text-sm text-text-secondary">{t('ACCOUNT_DATA.CONFLICT_HOW')}</Text>
            </>
          ) : (
            <Text className="text-sm text-text-secondary" testID="delete-account-blocked">
              {t('ACCOUNT_DATA.BLOCKED_DESC')}
            </Text>
          )}
          <Text className="text-xs text-text-secondary">{t('ACCOUNT_DATA.NOTHING_DELETED')}</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={t('ACCOUNT_DATA.DELETE_TITLE')}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy} testID="delete-account-cancel">
            {t('COMMON.CANCEL')}
          </Button>
          <Button variant="danger" loading={busy} disabled={!armed} onPress={remove} testID="delete-account-confirm">
            {t('ACCOUNT_DATA.DELETE_CONFIRM')}
          </Button>
        </>
      }
    >
      <View className="gap-4">
        <AlertBanner variant="error" title={t('ACCOUNT_DATA.DELETE_WARNING_TITLE')} message={t('ACCOUNT_DATA.DELETE_WARNING')} />
        <View className="gap-1">
          <Text className="text-sm text-text-secondary">{t('ACCOUNT_DATA.CONSEQUENCE_1')}</Text>
          <Text className="text-sm text-text-secondary">{t('ACCOUNT_DATA.CONSEQUENCE_2')}</Text>
          <Text className="text-sm text-text-secondary">{t('ACCOUNT_DATA.CONSEQUENCE_3')}</Text>
          <Text className="text-sm text-text-secondary">{t('ACCOUNT_DATA.CONSEQUENCE_4')}</Text>
        </View>
        {askPassword ? (
          <Input
            label={t('ACCOUNT_DATA.PASSWORD_LABEL')}
            type="password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setPasswordError(undefined);
            }}
            error={passwordError}
            autoComplete="current-password"
            textContentType="password"
            editable={!busy}
            testID="delete-account-password"
          />
        ) : null}
        <Input
          label={t('ACCOUNT_DATA.TYPE_TO_CONFIRM', { word: DELETE_CONFIRM_WORD })}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!busy}
          returnKeyType="go"
          onSubmitEditing={remove}
          testID="delete-account-word"
        />
      </View>
    </Modal>
  );
}
