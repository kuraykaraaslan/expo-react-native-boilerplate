import axiosInstance from "@/libs/axios";
import {
  DomainCreateResponseSchema,
  DomainDetailResponseSchema,
  DomainListResponseSchema,
  DomainVerifyResponseSchema,
  type Domain,
  type DomainDetail,
  type DomainVerifyResult,
} from "@/services/platform/domain.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export class DomainClientService {
  static async list(params: { page?: number; pageSize?: number } = {}): Promise<{ domains: Domain[]; total: number }> {
    const res = await axiosInstance.get("/domains", { params: { page: params.page ?? 1, pageSize: params.pageSize ?? 20 } });
    return DomainListResponseSchema.parse(res.data);
  }

  static async get(domainId: string): Promise<DomainDetail> {
    const res = await axiosInstance.get(`/domains/${encodeURIComponent(domainId)}`);
    const parsed = DomainDetailResponseSchema.parse(res.data);
    return { domain: parsed.domain, verification: parsed.verification ?? null };
  }

  static async create(domain: string): Promise<Domain> {
    const res = await axiosInstance.post("/domains", { domain: domain.trim().toLowerCase(), isPrimary: false });
    return DomainCreateResponseSchema.parse(res.data).domain;
  }

  /** Looks the DNS record up now. `isVerified: false` is an answer, not an error. */
  static async verify(domainId: string): Promise<DomainVerifyResult> {
    const res = await axiosInstance.post(`/domains/${encodeURIComponent(domainId)}/verify`, {});
    return DomainVerifyResponseSchema.parse(res.data);
  }

  /** Re-probes the certificate; re-read the domain afterwards for the new status. */
  static async checkSsl(domainId: string): Promise<void> {
    await axiosInstance.post(`/domains/${encodeURIComponent(domainId)}/ssl-check`, {});
  }

  static async remove(domainId: string): Promise<void> {
    await axiosInstance.delete(`/domains/${encodeURIComponent(domainId)}`);
  }
}
