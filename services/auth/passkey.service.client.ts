import axiosInstance from "@/libs/axios";
import {
  AckResponseSchema,
  DeviceLoginResponse,
  DeviceLoginResponseSchema,
} from "@/services/auth/auth.dto";
import {
  Passkey,
  PasskeyListResponse,
  PasskeyListResponseSchema,
  PasskeyLoginOptions,
  PasskeyLoginOptionsRequestSchema,
  PasskeyLoginOptionsSchema,
  PasskeyLoginVerifyRequest,
  PasskeyLoginVerifyRequestSchema,
  PasskeyRegisterVerifyRequest,
  PasskeyRegisterVerifyRequestSchema,
  PasskeyRegisterVerifyResponseSchema,
  PasskeyRegistrationOptions,
  PasskeyRegistrationOptionsSchema,
  PasskeyRenameRequestSchema,
  PasskeyRenameResponseSchema,
} from "@/services/auth/passkey.dto";

// Paths are relative: libs/axios adds the tenant prefix. Passkeys are stored per ACCOUNT (the list is the same in
// every organization), but every request is still addressed to a tenant and, for management, carries that tenant's
// bearer token.

export class PasskeyClientService {
  // ── Sign in (no session yet) ───────────────────────────────────────────────

  /**
   * POST /auth/device/passkey/login/options `{ email? }`. With an email the allow-list is that user's credentials
   * (404 USER_NOT_FOUND / PASSKEY_NOT_REGISTERED); without it a usernameless challenge is issued, and usernameless
   * challenges share ONE server slot, so two at once can invalidate each other — send the email when it is known.
   */
  static async loginOptions(email?: string, tenantId?: string): Promise<PasskeyLoginOptions> {
    const body = PasskeyLoginOptionsRequestSchema.parse(email ? { email } : {});
    const res = await axiosInstance.post("/auth/device/passkey/login/options", body, { tenantId, skipAuth: true });
    return PasskeyLoginOptionsSchema.parse(res.data);
  }

  /** POST /auth/device/passkey/login/verify → the same body as device login; the caller stores it (libs/session). */
  static async loginVerify(payload: PasskeyLoginVerifyRequest, tenantId?: string): Promise<DeviceLoginResponse> {
    const body = PasskeyLoginVerifyRequestSchema.parse(payload);
    const res = await axiosInstance.post("/auth/device/passkey/login/verify", body, { tenantId, skipAuth: true });
    return DeviceLoginResponseSchema.parse(res.data);
  }

  // ── Management (bearer) ────────────────────────────────────────────────────

  static async list(): Promise<PasskeyListResponse> {
    const res = await axiosInstance.get("/auth/me/security/passkeys");
    return PasskeyListResponseSchema.parse(res.data);
  }

  /** GET …/passkeys/register — the challenge is kept server-side for 5 minutes; 409 PASSKEY_LIMIT_REACHED at 10. */
  static async registrationOptions(): Promise<PasskeyRegistrationOptions> {
    const res = await axiosInstance.get("/auth/me/security/passkeys/register");
    return PasskeyRegistrationOptionsSchema.parse(res.data);
  }

  static async registerVerify(payload: PasskeyRegisterVerifyRequest): Promise<string> {
    const body = PasskeyRegisterVerifyRequestSchema.parse(payload);
    const res = await axiosInstance.post("/auth/me/security/passkeys/register/verify", body);
    return PasskeyRegisterVerifyResponseSchema.parse(res.data).credentialId;
  }

  static async rename(credentialId: string, label: string): Promise<Passkey> {
    const body = PasskeyRenameRequestSchema.parse({ label });
    const res = await axiosInstance.patch(`/auth/me/security/passkeys/${encodeURIComponent(credentialId)}`, body);
    return PasskeyRenameResponseSchema.parse(res.data).passkey;
  }

  static async remove(credentialId: string): Promise<void> {
    const res = await axiosInstance.delete(`/auth/me/security/passkeys/${encodeURIComponent(credentialId)}`);
    AckResponseSchema.parse(res.data);
  }
}
