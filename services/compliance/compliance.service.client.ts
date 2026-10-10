import axiosInstance from "@/libs/axios";
import {
  AcceptAgreementRequestSchema,
  AcceptAgreementResponseSchema,
  AuditLogsResponseSchema,
  ConsentConfigResponseSchema,
  ConsentStateResponseSchema,
  CurrentAgreementSchema,
  CurrentAgreementsResponseSchema,
  RecordConsentRequestSchema,
  type AcceptAgreementRequest,
  type AcceptAgreementResponse,
  type AuditLogsResponse,
  type AuditSeverity,
  type ConsentConfig,
  type CurrentAgreement,
  type RecordConsentRequest,
} from "@/services/compliance/compliance.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

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
}
