import axiosInstance from "@/libs/axios";
import {
  AccountDeletionResponseSchema,
  DataExportResponseSchema,
  DeletionConflictDetailsSchema,
  SelfServiceReauthRequestSchema,
  AcceptAgreementRequestSchema,
  AcceptAgreementResponseSchema,
  AuditLogsResponseSchema,
  ConsentConfigResponseSchema,
  ConsentStateResponseSchema,
  CurrentAgreementSchema,
  CurrentAgreementsResponseSchema,
  RecordConsentRequestSchema,
  type AccountDeletionResponse,
  type DataExportResponse,
  type DeletionConflictTenant,
  type AcceptAgreementRequest,
  type AcceptAgreementResponse,
  type AuditLogsResponse,
  type AuditSeverity,
  type ConsentConfig,
  type CurrentAgreement,
  type RecordConsentRequest,
} from "@/services/compliance/compliance.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

/**
 * Erasure and dossier building run per workspace on the server and can outlast the default 10 s transport
 * timeout. A client timeout on a deletion that the server then completes would leave the device signed in
 * to an account that no longer exists, so these two calls wait longer.
 */
const SELF_SERVICE_TIMEOUT_MS = 120_000;

export class ComplianceClientService {
  /** The organization's consent purposes (what the web cookie banner shows). Public. */
  static async getConsentConfig(): Promise<ConsentConfig> {
    const res = await axiosInstance.get("/consent/config");
    return ConsentConfigResponseSchema.parse(res.data).config;
  }

  /**
   * The signed-in user's current choice per purpose (the session is the subject, so no
   * `userId` is sent); a purpose never answered is missing from the map.
   */
  static async getConsentState(): Promise<Record<string, boolean>> {
    const res = await axiosInstance.get("/consent");
    return ConsentStateResponseSchema.parse(res.data).state;
  }

  /** Records for the session user. The body carries no `userId` (the server refuses another one). */
  static async recordConsent(payload: RecordConsentRequest): Promise<void> {
    const body = RecordConsentRequestSchema.parse(payload);
    await axiosInstance.post("/consent", body);
  }

  /** GET /agreements/current — active reusable agreements with their published current version. Public. */
  static async getCurrentAgreements(opts: { requiresAcceptance?: boolean } = {}): Promise<CurrentAgreement[]> {
    const res = await axiosInstance.get("/agreements/current", { params: opts });
    return CurrentAgreementsResponseSchema.parse(res.data).data;
  }

  /** GET /agreements/current?type= — 404 AGREEMENT_NOT_FOUND, 409 NO_PUBLISHED_VERSION. */
  static async getCurrentAgreement(type: string): Promise<CurrentAgreement> {
    const res = await axiosInstance.get("/agreements/current", { params: { type } });
    return CurrentAgreementSchema.parse(res.data);
  }

  /** POST /agreements/accept — the subject is the session user; no `userId` or `anonymousId` is sent. */
  static async acceptAgreement(payload: AcceptAgreementRequest): Promise<AcceptAgreementResponse> {
    const body = AcceptAgreementRequestSchema.parse(payload);
    const res = await axiosInstance.post("/agreements/accept", body);
    return AcceptAgreementResponseSchema.parse(res.data);
  }

  /** Admin only (`audit_log.logs.read`); some plans do not include the audit log and answer 403. */
  static async getAuditLogs(params: {
    page?: number;
    pageSize?: number;
    severity?: AuditSeverity;
    /** Substring match on the action name. */
    action?: string;
    actorId?: string;
    resourceType?: string;
    /** Inclusive bounds on `createdAt` (ISO datetimes). */
    fromDate?: string;
    toDate?: string;
  }): Promise<AuditLogsResponse> {
    const res = await axiosInstance.get("/audit-logs", { params });
    return AuditLogsResponseSchema.parse(res.data);
  }

  /**
   * POST /auth/me/deletion-request: deletes the whole account NOW (ACCOUNT scope; the URL tenant only routes).
   * `password` is sent only when the account has one (400 PASSWORD_REQUIRED / 401 INVALID_PASSWORD otherwise);
   * 409 means a platform admin or the last owner of a shared workspace (see `deletionConflictTenants`).
   * Not retried and never replayed: success revokes every session, so a replay would only 401.
   */
  static async requestAccountDeletion(password?: string): Promise<AccountDeletionResponse> {
    const body = SelfServiceReauthRequestSchema.parse(password ? { password } : {});
    const res = await axiosInstance.post("/auth/me/deletion-request", body, { timeout: SELF_SERVICE_TIMEOUT_MS });
    return AccountDeletionResponseSchema.parse(res.data);
  }

  /** POST /auth/me/data-export-request for one workspace (TENANT scope; the caller must be a member). Same re-auth as deletion. */
  static async requestDataExport(tenantId: string, password?: string): Promise<DataExportResponse> {
    const body = SelfServiceReauthRequestSchema.parse(password ? { password } : {});
    const res = await axiosInstance.post("/auth/me/data-export-request", body, { tenantId, timeout: SELF_SERVICE_TIMEOUT_MS });
    return DataExportResponseSchema.parse(res.data);
  }

  /** The workspaces a 409 deletion refusal names in `details.tenants`; null when the error is not that refusal. */
  static deletionConflictTenants(err: unknown): DeletionConflictTenant[] | null {
    const response = (err as { response?: { status?: number; data?: { details?: unknown } } } | null)?.response;
    if (response?.status !== 409) return null;
    const parsed = DeletionConflictDetailsSchema.safeParse(response.data?.details);
    return parsed.success && parsed.data.tenants.length > 0 ? parsed.data.tenants : null;
  }
}
