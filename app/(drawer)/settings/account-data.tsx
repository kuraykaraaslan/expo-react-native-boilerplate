import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { faDownload, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { DeleteAccountModal } from '@/components/compliance/DeleteAccountModal';
import { ExportDataModal } from '@/components/compliance/ExportDataModal';
import { LinkTile } from '@/components/common/LinkTile';
import { Screen } from '@/components/common/Screen';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Card, Text } from '@/components/ui';
import { accountHasOwnPassword } from '@/libs/reauth';
import { useTenantStore } from '@/stores/tenantStore';

/** "Your data": export what the active organization holds about you, or delete the whole account. */
export default function AccountDataScreen() {
  const { t } = useTranslation();
  const tenantId = useTenantStore((s) => s.activeTenantId);
  // The hint is tagged with the organization it was read in; null while unknown or unreadable, and the
  // modals then ask for the password and the server decides.
  const [hint, setHint] = useState<{ tenantId: string | null; value: boolean | null } | null>(null);
  const hasPassword = hint?.tenantId === tenantId ? hint.value : null;
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    accountHasOwnPassword().then((value) => {
      if (!cancelled) setHint({ tenantId, value });
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <Screen>
      <ScreenHeader back={{ label: t('PRIVACY.TITLE'), href: '/settings/legal' }} title={t('ACCOUNT_DATA.TITLE')} subtitle={t('ACCOUNT_DATA.SUBTITLE')} />

      <Card title={t('ACCOUNT_DATA.EXPORT_CARD')} subtitle={t('ACCOUNT_DATA.EXPORT_CARD_DESC')}>
        <LinkTile icon={faDownload} title={t('ACCOUNT_DATA.EXPORT_TITLE')} description={t('ACCOUNT_DATA.EXPORT_TILE_DESC')} onPress={() => setExportOpen(true)} testID="account-data-export" />
      </Card>

      <Card title={t('ACCOUNT_DATA.DELETE_CARD')} subtitle={t('ACCOUNT_DATA.DELETE_CARD_DESC')}>
        <Text className="pb-3 text-sm text-text-secondary">{t('ACCOUNT_DATA.DELETE_CARD_NOTE')}</Text>
        <LinkTile icon={faTrashCan} title={t('ACCOUNT_DATA.DELETE_TITLE')} description={t('ACCOUNT_DATA.DELETE_TILE_DESC')} onPress={() => setDeleteOpen(true)} danger testID="account-data-delete" />
      </Card>

      {/* Mounted only while open, so every opening starts with empty fields. */}
      {exportOpen ? <ExportDataModal open onClose={() => setExportOpen(false)} hasPassword={hasPassword} /> : null}
      {deleteOpen ? <DeleteAccountModal open onClose={() => setDeleteOpen(false)} hasPassword={hasPassword} /> : null}
    </Screen>
  );
}
