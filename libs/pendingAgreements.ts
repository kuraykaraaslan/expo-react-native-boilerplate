import { useShallow } from "zustand/react/shallow";
import { normalizeApiError } from "@/libs/apiError";
import logger from "@/libs/logger";
import type { ComplianceSection, PendingAgreement } from "@/services/compliance/compliance.dto";
import { AuthClientService } from "@/services/auth/auth.service.client";
import { useAuthStore } from "@/stores/authStore";
import { useComplianceStore } from "@/stores/complianceStore";
import { getActiveTenantId, useTenantStore } from "@/stores/tenantStore";

// ============================================================================
// Pending agreements — the non-blocking "something needs your acceptance" flag.
// Fed by the `compliance` section of GET /auth/session and the device login body;
// read by the home banner and the legal screen. Like libs/realtime.ts, a late
// answer never lands in another organization's or a signed-out session's state.
// ============================================================================

const EMPTY: PendingAgreement[] = [];
let refreshSeq = 0;

/** Stores what a session answer said for `tenantId`. An absent section means nothing is pending there. */
export function applyCompliance(tenantId: string, compliance: ComplianceSection | null | undefined): void {
  refreshSeq += 1; // a fresher answer supersedes any background refresh still in flight
  useComplianceStore.getState().set(tenantId, compliance?.pendingAgreements ?? []);
}

/** Forgets the flag (sign-out, session death). Also invalidates a refresh still in flight. */
export function clearPendingAgreements(): void {
  refreshSeq += 1;
  useComplianceStore.getState().clear();
}

/** Re-reads the flag from GET /auth/session for the active organization. Background: failures are logged, not toasted. */
export async function refreshPendingAgreements(): Promise<void> {
  const tenantId = getActiveTenantId();
  const seq = ++refreshSeq;
  try {
    const session = await AuthClientService.getSession(tenantId);
    if (seq !== refreshSeq || getActiveTenantId() !== tenantId || !useAuthStore.getState().isAuthenticated) return;
    applyCompliance(tenantId, session.compliance);
  } catch (err) {
    logger.warn("[pendingAgreements] refresh failed", normalizeApiError(err).statusCode ?? "no response"); // status only: the raw error carries the bearer header
  }
}

/** The pending agreements of the ACTIVE organization (a flag read for another one is ignored). */
export function usePendingAgreements(): PendingAgreement[] {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  return useComplianceStore(
    useShallow((s) => (s.tenantId !== null && s.tenantId === (activeTenantId ?? getActiveTenantId()) ? s.pending : EMPTY)),
  );
}
