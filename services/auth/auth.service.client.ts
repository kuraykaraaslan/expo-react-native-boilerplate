import axiosInstance from "@/libs/axios";
import { getSessionIdFromToken } from "@/libs/jwt";
import { getToken } from "@/libs/secureStorage";
import { getActiveTenantId } from "@/stores/tenantStore";
import {
  AckResponseSchema,
  ChangePasswordRequest,
  ChangePasswordRequestSchema,
  DeviceLoginRequest,
  DeviceLoginRequestSchema,
  DeviceLoginResponse,
  DeviceLoginResponseSchema,
  ForgotPasswordRequest,
  ForgotPasswordRequestSchema,
  MeSecurityResponseSchema,
  OTPAction,
  OTPMethod,
  OTPSendRequestSchema,
  OTPVerifyRequestSchema,
  RegisterRequest,
  RegisterRequestSchema,
  RegisterResponse,
  RegisterResponseSchema,
  ResetPasswordRequest,
  ResetPasswordRequestSchema,
  RevokeSessionResponse,
  RevokeSessionResponseSchema,
  Session,
  SessionResponse,
  SessionResponseSchema,
  SessionsListResponseSchema,
  TOTPCodeRequestSchema,
  TOTPEnableResponse,
  TOTPEnableResponseSchema,
  TOTPSetupResponse,
  TOTPSetupResponseSchema,
  UserSecurity,
} from "@/services/auth/auth.dto";

// Paths are relative: libs/axios adds the active tenant's address prefix.

export class AuthClientService {
  // ── Sign in / out ──────────────────────────────────────────────────────────

  /**
   * Device-bearer login. Returns the token pair and the session context; the
   * caller stores the tokens (libs/session.startDeviceSession). `tenantId`
   * defaults to the active tenant — each tenant needs its own login (K2).
   */
  static async deviceLogin(payload: DeviceLoginRequest, tenantId?: string): Promise<DeviceLoginResponse> {
    const body = DeviceLoginRequestSchema.parse(payload);
    const res = await axiosInstance.post("/auth/device/login", body, { tenantId, skipAuth: true });
    return DeviceLoginResponseSchema.parse(res.data);
  }

  /**
   * Revokes this device's session for one tenant on the server (default: the
   * active tenant).
   *
   * POST /auth/logout is not used: it only looks at the accessToken *cookie*
   * and, called with a bearer token, answers 200 without revoking anything —
   * the session and its 7-day refresh token would stay valid. Deleting the
   * session by id (read from that tenant's access token) does revoke it.
   * Callers clear local tokens regardless of the outcome (libs/logout).
   */
  static async logout(tenantId: string = getActiveTenantId()): Promise<void> {
    const accessToken = await getToken("accessToken", tenantId);
    const sessionId = accessToken ? getSessionIdFromToken(accessToken) : null;
    if (!sessionId) return; // nothing identifies a server session — local sign-out only
    await this.revokeSession(sessionId, tenantId);
  }

  static async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const body = RegisterRequestSchema.parse(payload);
    const res = await axiosInstance.post("/auth/register", body, { skipAuth: true });
    return RegisterResponseSchema.parse(res.data);
  }

  // ── Session ────────────────────────────────────────────────────────────────

  /** GET /auth/session — `user` here is the slim `{userId, email, userRole}`, plus tenant and membership. */
  static async getSession(tenantId?: string): Promise<SessionResponse> {
    const res = await axiosInstance.get("/auth/session", { tenantId });
    return SessionResponseSchema.parse(res.data);
  }

  static async getSessions(): Promise<Session[]> {
    const res = await axiosInstance.get("/auth/me/sessions");
    return SessionsListResponseSchema.parse(res.data).sessions;
  }

  static async revokeSession(sessionId: string, tenantId?: string): Promise<RevokeSessionResponse> {
    const res = await axiosInstance.delete(`/auth/me/sessions/${encodeURIComponent(sessionId)}`, { tenantId });
    return RevokeSessionResponseSchema.parse(res.data);
  }

  static async getSecurity(): Promise<UserSecurity> {
    const res = await axiosInstance.get("/auth/me/security");
    return MeSecurityResponseSchema.parse(res.data).userSecurity;
  }

  // ── OTP / TOTP ─────────────────────────────────────────────────────────────

  static async sendOTP(method: OTPMethod, action: OTPAction): Promise<void> {
    const body = OTPSendRequestSchema.parse({ method, action });
    const res = await axiosInstance.post("/auth/otp/send", body);
    AckResponseSchema.parse(res.data);
  }

  /** Answers `{ message }` only — re-read the session (getSession) afterwards; there is no user in the reply. */
  static async verifyOTP(method: OTPMethod, action: OTPAction, otpToken: string): Promise<void> {
    const body = OTPVerifyRequestSchema.parse({ method, action, otpToken });
    const res = await axiosInstance.post("/auth/otp/verify", body);
    AckResponseSchema.parse(res.data);
  }

  static async setupTOTP(): Promise<TOTPSetupResponse> {
    const res = await axiosInstance.post("/auth/totp/setup", {});
    return TOTPSetupResponseSchema.parse(res.data);
  }

  static async enableTOTP(otpToken: string): Promise<TOTPEnableResponse> {
    const body = TOTPCodeRequestSchema.parse({ otpToken });
    const res = await axiosInstance.post("/auth/totp/enable", body);
    return TOTPEnableResponseSchema.parse(res.data);
  }

  static async disableTOTP(otpToken: string): Promise<void> {
    const body = TOTPCodeRequestSchema.parse({ otpToken });
    const res = await axiosInstance.post("/auth/totp/disable", body);
    AckResponseSchema.parse(res.data);
  }

  // ── Passwords ──────────────────────────────────────────────────────────────

  static async forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
    const body = ForgotPasswordRequestSchema.parse(payload);
    const res = await axiosInstance.post("/auth/forgot-password", body, { skipAuth: true });
    AckResponseSchema.parse(res.data);
  }

  static async resetPassword(payload: ResetPasswordRequest): Promise<void> {
    const body = ResetPasswordRequestSchema.parse(payload);
    const res = await axiosInstance.post("/auth/reset-password", body, { skipAuth: true });
    AckResponseSchema.parse(res.data);
  }

  /** A wrong current password is `401 { error: "INVALID_CREDENTIALS" }` — not a dead session. */
  static async changePassword(payload: ChangePasswordRequest): Promise<void> {
    const body = ChangePasswordRequestSchema.parse(payload);
    const res = await axiosInstance.post("/auth/change-password", body);
    AckResponseSchema.parse(res.data);
  }
}
