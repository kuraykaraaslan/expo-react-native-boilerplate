import axiosInstance from "@/libs/axios";
import {
  ApiKeyIssuedResponseSchema,
  ApiKeyListResponseSchema,
  CreateApiKeyRequestSchema,
  RevokeAllResponseSchema,
  ScopeDefinitionListResponseSchema,
  type ApiKey,
  type ApiKeyIssued,
  type CreateApiKeyRequest,
  type ScopeDefinition,
} from "@/services/platform/apiKey.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export class ApiKeyClientService {
  static async list(params: { page?: number; pageSize?: number } = {}): Promise<{ keys: ApiKey[]; total: number }> {
    const res = await axiosInstance.get("/api-keys", { params: { page: params.page ?? 1, pageSize: params.pageSize ?? 20 } });
    return ApiKeyListResponseSchema.parse(res.data);
  }

  /** Active scope definitions the key form offers. */
  static async getScopeDefinitions(): Promise<ScopeDefinition[]> {
    const res = await axiosInstance.get("/api-keys/scope-definitions", { params: { page: 0, pageSize: 100 } });
    return ScopeDefinitionListResponseSchema.parse(res.data).data.filter((d) => d.isActive !== false);
  }

  /** The answer carries the plaintext key — the only time it exists. */
  static async create(payload: CreateApiKeyRequest): Promise<ApiKeyIssued> {
    const body = CreateApiKeyRequestSchema.parse(payload);
    const res = await axiosInstance.post("/api-keys", body);
    return ApiKeyIssuedResponseSchema.parse(res.data);
  }

  /** Mints a successor; the old key keeps working for `graceSeconds` (0 = revoked at once). */
  static async rotate(apiKeyId: string, graceSeconds?: number): Promise<ApiKeyIssued> {
    const res = await axiosInstance.post(`/api-keys/${encodeURIComponent(apiKeyId)}/rotate`, graceSeconds === undefined ? {} : { graceSeconds });
    return ApiKeyIssuedResponseSchema.parse(res.data);
  }

  static async revoke(apiKeyId: string): Promise<void> {
    await axiosInstance.delete(`/api-keys/${encodeURIComponent(apiKeyId)}`);
  }

  /** Incident response: switches off every active key. Returns how many. */
  static async revokeAll(): Promise<number> {
    const res = await axiosInstance.post("/api-keys/revoke-all", {});
    return RevokeAllResponseSchema.parse(res.data).revokedCount;
  }
}
