import { useEffect } from "react";
import { router } from "expo-router";
import { invitationParams } from "@/libs/deepLinks";
import { usePendingLinkStore } from "@/stores/pendingLinkStore";

/**
 * Forwards an invitation link that was opened before sign-in to its screen once the session is
 * fully open (`open`). The link is consumed first, so it can fire only once.
 */
export function usePendingLinks(open: boolean): void {
  const invitation = usePendingLinkStore((s) => s.invitation);
  useEffect(() => {
    if (!open || !invitation) return;
    usePendingLinkStore.getState().setInvitation(null);
    router.push({ pathname: '/invitation', params: invitationParams(invitation) });
  }, [open, invitation]);
}
