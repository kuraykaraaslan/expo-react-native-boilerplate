import { create } from "zustand";
import type { InvitationLink } from "@/libs/deepLinks";

// ============================================================================
// Pending deep link - an invitation link opened while nobody could act on it yet
// (signed out, OTP or password change pending). The sign-in flow ends in the
// drawer, which then forwards to /invitation. Memory only and secret-free: just
// the organization and the button the e-mail link was for, never the token.
// ============================================================================

interface PendingLinkState {
  invitation: InvitationLink | null;
  setInvitation: (link: InvitationLink | null) => void;
}

export const usePendingLinkStore = create<PendingLinkState>()((set) => ({
  invitation: null,
  setInvitation: (invitation) => set({ invitation }),
}));
