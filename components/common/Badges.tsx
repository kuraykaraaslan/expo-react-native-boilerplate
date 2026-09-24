import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui';
import type { InvitationStatus, MemberRole, MemberStatus } from '@/dto/tenant.dto';

type BadgeVariant = 'primary' | 'warning' | 'neutral' | 'success' | 'error';

// Same mapping as next-boilerplate's member/invitation columns.
const ROLE_VARIANT: Record<MemberRole, BadgeVariant> = { OWNER: 'primary', ADMIN: 'warning', USER: 'neutral' };
const MEMBER_STATUS_VARIANT: Record<MemberStatus, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  SUSPENDED: 'error',
  PENDING: 'warning',
};
const INVITATION_VARIANT: Record<InvitationStatus, BadgeVariant> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'error',
  EXPIRED: 'neutral',
  REVOKED: 'neutral',
};

/** OWNER / ADMIN / USER — uppercase, as in next-boilerplate. */
export function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <Badge variant={ROLE_VARIANT[role] ?? 'neutral'} size="sm">
      {role}
    </Badge>
  );
}

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={MEMBER_STATUS_VARIANT[status] ?? 'neutral'} size="sm" dot>
      {t(`MEMBERS.STATUS_${status}`)}
    </Badge>
  );
}

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={INVITATION_VARIANT[status] ?? 'neutral'} size="sm">
      {t(`INVITATIONS.STATUS_${status}`)}
    </Badge>
  );
}
