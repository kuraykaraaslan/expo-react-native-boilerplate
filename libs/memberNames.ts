import logger from "@/libs/logger";
import { TenantClientService } from "@/services/tenant/tenant.service.client";
import type { TenantMember } from "@/services/tenant/tenant.dto";
import { useMessagingStore } from "@/stores/messagingStore";
import { getActiveTenantId } from "@/stores/tenantStore";

/** Best label for a member: display name, then name, then e-mail. */
export function memberLabel(m: Pick<TenantMember, "user">): string {
  const profile = m.user?.userProfile;
  return profile?.displayName?.trim() || profile?.name?.trim() || m.user?.email || "";
}

/** Loads the member directory into the messaging store (userId → name). Failure keeps what is known. */
export async function loadMemberNames(): Promise<TenantMember[]> {
  const tenantId = getActiveTenantId();
  try {
    const { members } = await TenantClientService.getMembers(tenantId, { page: 0, pageSize: 100, memberStatus: "ACTIVE" });
    const names: Record<string, string> = {};
    for (const m of members) {
      const label = memberLabel(m);
      if (label) names[m.userId] = label;
    }
    if (getActiveTenantId() === tenantId) useMessagingStore.getState().setNames(names);
    return members;
  } catch (err) {
    logger.warn("[messaging] member names unavailable", err); // a plain member may not be allowed to list members
    return [];
  }
}
