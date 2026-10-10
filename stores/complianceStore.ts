import { create } from "zustand";
import type { PendingAgreement } from "@/services/compliance/compliance.dto";

// ============================================================================
// Compliance store — which required agreements the signed-in user still has to
// accept (`compliance.pendingAgreements` of GET /auth/session and device login).
// A flag only: nothing is blocked. NOT persisted — the server recomputes it on
// every session read, and a stale copy could nag about an agreement already
// accepted on another device. Tagged with the organization it was read for.
// ============================================================================

interface ComplianceState {
  tenantId: string | null;
  pending: PendingAgreement[];
  set: (tenantId: string, pending: PendingAgreement[]) => void;
  /** Drops one pending entry after the server accepted it. */
  resolve: (tenantId: string, agreementId: string) => void;
  clear: () => void;
}

export const useComplianceStore = create<ComplianceState>()((set) => ({
  tenantId: null,
  pending: [],
  set: (tenantId, pending) => set({ tenantId, pending }),
  resolve: (tenantId, agreementId) =>
    set((s) => (s.tenantId === tenantId ? { pending: s.pending.filter((p) => p.agreementId !== agreementId) } : s)),
  clear: () => set({ tenantId: null, pending: [] }),
}));
