import axiosInstance from "@/libs/axios";
import { AckResponseSchema } from "@/services/auth/auth.dto";
import {
  RegisterPushTokenRequest,
  RegisterPushTokenRequestSchema,
  UnregisterPushTokenQuery,
  UnregisterPushTokenQuerySchema,
} from "@/services/user/push.dto";

// Paths are relative: libs/axios adds the tenant prefix. A device token is bound to ONE tenant (K2), so
// every call names the tenant explicitly — the token pair stored for that tenant is the one sent.

export class PushClientService {
  /** POST …/notifications/push/tokens → 200 `{ message }`. Idempotent; 429 past the per-user device cap. */
  static async register(tenantId: string, payload: RegisterPushTokenRequest): Promise<void> {
    const body = RegisterPushTokenRequestSchema.parse(payload);
    const res = await axiosInstance.post("/notifications/push/tokens", body, { tenantId });
    AckResponseSchema.parse(res.data);
  }

  /** DELETE …/notifications/push/tokens?deviceId=… → 200 `{ message }`. Only ever removes the caller's own rows. */
  static async unregister(tenantId: string, query: UnregisterPushTokenQuery, timeoutMs?: number): Promise<void> {
    const params = UnregisterPushTokenQuerySchema.parse(query);
    const res = await axiosInstance.delete("/notifications/push/tokens", { tenantId, params, timeout: timeoutMs });
    AckResponseSchema.parse(res.data);
  }
}
