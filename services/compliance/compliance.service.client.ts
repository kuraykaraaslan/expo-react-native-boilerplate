import axiosInstance from "@/libs/axios";
import {
  AuditLogsResponseSchema,
  ConsentConfigResponseSchema,
  ConsentStateResponseSchema,
  RecordConsentRequestSchema,
  type AuditLogsResponse,
  type AuditSeverity,
  type ConsentConfig,
  type RecordConsentRequest,
} from "@/services/compliance/compliance.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export class ComplianceClientService {
  /** The organization's consent purposes (what the web cookie banner shows). Public. */
  static async getConsentConfig(): Promise<ConsentConfig> {
    const res = await axiosInstance.get("/consent/config");
    return ConsentConfigResponseSchema.parse(res.data).config;
  }

  /** The user's current choice per purpose; a purpose never answered is missing from the map. */
  static async getConsentState(userId: string): Promise<Record<string, boolean>> {
    const res = await axiosInstance.get("/consent", { params: { userId } });
    return ConsentStateResponseSchema.parse(res.data).state;
  }

  static async recordConsent(payload: RecordConsentRequest): Promise<void> {
    const body = RecordConsentRequestSchema.parse(payload);
    await axiosInstance.post("/consent", body);
  }

  /** Admin only (`audit_log.logs.read`); some plans do not include the audit log and answer 403. */
  static async getAuditLogs(params: {
    page?: number;
    pageSize?: number;
    severity?: AuditSeverity;
    action?: string;
  }): Promise<AuditLogsResponse> {
    const res = await axiosInstance.get("/audit-logs", { params });
    return AuditLogsResponseSchema.parse(res.data);
  }
}
