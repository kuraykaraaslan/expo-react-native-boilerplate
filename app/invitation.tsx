import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { PendingInvitations } from '@/components/tenant/PendingInvitations';
import { EmptyState, Spinner } from '@/components/ui';
import type { InvitationAction } from '@/libs/deepLinks';
import { refreshTenantOverview } from '@/libs/invitations';
import { useAuthStore } from '@/stores/authStore';
import { usePendingLinkStore } from '@/stores/pendingLinkStore';
import { useTenantStore } from '@/stores/tenantStore';

/**
 * Landing screen of the e-mailed /auth/invitation/(accept|decline) links (routed here by
 * app/+native-intent.tsx). It reads the account's pending invitations and offers the same
 * Accept / Decline as the organization screen; the link's token is never used (libs/deepLinks.ts).
 * Opened before the session is usable, the link is remembered and resumed after sign-in.
 */
export default function InvitationLinkScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tenantId?: string; action?: string }>();
  const action: InvitationAction = params.action === 'decline' ? 'decline' : 'accept';
  const tenantId = typeof params.tenantId === 'string' ? params.tenantId : null;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const otpRequired = useAuthStore((s) => s.otpRequired);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const invitations = useTenantStore((s) => s.pendingInvitations);
  const open = isAuthenticated && !otpRequired && !mustChangePassword;

  const [loading, setLoading] = useState(true);
  // An answered invitation leaves the list; the "you joined" card then lives in PendingInvitations, so do not show "none".
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (invitations.length > 0) setSeen(true);
  }, [invitations.length]);

  useEffect(() => {
    if (!open) {
      usePendingLinkStore.getState().setInvitation({ tenantId, action });
      return;
    }
    usePendingLinkStore.getState().setInvitation(null);
    let cancelled = false;
    setLoading(true);
    // Stale answers (organization switch, sign-out) are dropped inside refreshTenantOverview.
    void refreshTenantOverview().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, activeTenantId, tenantId, action]);

  if (!isAuthenticated) return <Redirect href="/login" />;
  if (otpRequired) return <Redirect href="/2fa" />;
  if (mustChangePassword) return <Redirect href="/change-password" />;

  return (
    <AuthShell
      title={t('INVITATION_LINK.TITLE')}
      subtitle={t(action === 'decline' ? 'INVITATION_LINK.SUBTITLE_DECLINE' : 'INVITATION_LINK.SUBTITLE_ACCEPT')}
      icon={faEnvelopeOpenText}
      footer={<AuthFooterLink label={t('AUTH_UI.BACK_TO_APP')} href="/" testID="invitation-link-back" />}
    >
      <PendingInvitations />
      {loading && !seen ? (
        <View className="items-center py-8" accessibilityState={{ busy: true }}>
          <Spinner size="lg" />
        </View>
      ) : null}
      {!loading && !seen ? (
        <EmptyState icon={faEnvelopeOpenText} title={t('INVITATION_LINK.NONE_TITLE')} description={t('INVITATION_LINK.NONE_DESC')} className="py-6" />
      ) : null}
    </AuthShell>
  );
}
