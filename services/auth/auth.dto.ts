import { z } from "zod";
import { MemberRoleEnum, TenantStatusEnum } from "@/services/tenant/tenant.dto";
import { UserProfileSchema } from "@/services/user/profile.dto";

// ============================================================================
// Auth DTOs — mirror of next-boilerplate auth / user / user_security /
// user_session types and the device-bearer routes that return them.
// Dates arrive as ISO strings (JSON). Keys the server may leave out are nullish.
// ============================================================================

// ── Enums ─────────────────────────────────────────────────────────────────────

export const OTPMethodEnum = z.enum(["EMAIL", "SMS", "TOTP_APP"]);
export type OTPMethod = z.infer<typeof OTPMethodEnum>;

export const OTPActionEnum = z.enum(["enable", "disable", "authenticate"]);
export type OTPAction = z.infer<typeof OTPActionEnum>;

export const UserRoleEnum = z.enum(["USER", "ADMIN"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const UserStatusEnum = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);
export type UserStatus = z.infer<typeof UserStatusEnum>;

export const SessionStatusEnum = z.enum(["ACTIVE", "EXPIRED", "REVOKED"]);
export type SessionStatus = z.infer<typeof SessionStatusEnum>;

// ── User ──────────────────────────────────────────────────────────────────────

/**
 * SafeUser, as returned by login. It has NO `name` / `image` / `language` /
 * `theme`: the display name and picture are under `userProfile`, language and
 * theme under user preferences (services/user/preferences.dto.ts).
 */
export const SafeUserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  phone: z.string().nullish(),
  userRole: UserRoleEnum.default("USER"),
  userStatus: UserStatusEnum.default("ACTIVE"),
  emailVerifiedAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  userProfile: UserProfileSchema.nullish(),
});
export type SafeUser = z.infer<typeof SafeUserSchema>;

/** The slim user in GET /auth/session. */
export const SessionUserSchema = z.object({
  userId: z.string(),
  email: z.string(),
  userRole: UserRoleEnum,
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

// ── Security ──────────────────────────────────────────────────────────────────

export const TrustedDeviceSchema = z.object({
  idHash: z.string(),
  label: z.string().nullish(),
  createdAt: z.string(),
  lastSeenAt: z.string().nullish(),
  expiresAt: z.string(),
});
export type TrustedDevice = z.infer<typeof TrustedDeviceSchema>;

/** SafeUserSecurity. */
export const UserSecuritySchema = z.object({
  otpMethods: z.array(OTPMethodEnum).nullish().transform((v) => v ?? []),
  lastLoginAt: z.string().nullish(),
  lastLoginIp: z.string().nullish(),
  lastLoginDevice: z.string().nullish(),
  failedLoginAttempts: z.number().nullish().transform((v) => v ?? 0),
  lockedUntil: z.string().nullish(),
  passkeyEnabled: z.boolean().nullish().transform((v) => v ?? false),
  trustedDevices: z.array(TrustedDeviceSchema).nullish().transform((v) => v ?? []),
  passwordChangedAt: z.string().nullish(),
  mustChangePassword: z.boolean().nullish().transform((v) => v ?? false),
});
export type UserSecurity = z.infer<typeof UserSecuritySchema>;

// ── Device info ───────────────────────────────────────────────────────────────

/** DeviceInfoDTO, including the server's length limits. Omit unknown fields — never send null. */
export const DeviceInfoSchema = z.object({
  type: z.enum(["phone", "tablet", "watch", "tv", "desktop", "other"]).optional(),
  brand: z.string().max(80).optional(),
  model: z.string().max(80).optional(),
  name: z.string().max(120).optional(),
  os: z.string().max(40).optional(),
  osVersion: z.string().max(40).optional(),
  appVersion: z.string().max(40).optional(),
});
export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

// ── Sessions ──────────────────────────────────────────────────────────────────

/** SessionMetaSchema (passthrough bag on UserSession.metadata). */
export const SessionMetaSchema = z
  .object({
    geo: z
      .object({
        city: z.string().nullish(),
        state: z.string().nullish(),
        country: z.string().nullish(),
        countryCode: z.string().nullish(),
      })
      .optional(),
    impersonation: z
      .object({
        impersonatorUserId: z.string(),
        impersonatorSessionId: z.string(),
        tenantId: z.string().optional(),
        targetTenantRole: MemberRoleEnum.optional(),
      })
      .optional(),
    rememberMe: z.boolean().optional(),
    device: DeviceInfoSchema.optional(),
  })
  .passthrough();
export type SessionMeta = z.infer<typeof SessionMetaSchema>;

/** SafeUserSession — tokens and fingerprint are never sent. `tenantId` tells apart other organizations' sessions. */
export const SessionSchema = z.object({
  userSessionId: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  userAgent: z.string().nullish(),
  ipAddress: z.string().nullish(),
  sessionStatus: SessionStatusEnum.default("ACTIVE"),
  otpVerifyNeeded: z.boolean().nullish().transform((v) => v ?? false),
  sessionExpiry: z.string(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  metadata: SessionMetaSchema.nullish(),
});
export type Session = z.infer<typeof SessionSchema>;

// ── Request DTOs ──────────────────────────────────────────────────────────────

/** Form-level credentials check. */
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/** POST /auth/device/login body (DeviceLoginDTO). */
export const DeviceLoginRequestSchema = LoginRequestSchema.extend({
  captchaToken: z.string().optional(),
  rememberMe: z.boolean().optional(),
  device: DeviceInfoSchema.optional(),
});
export type DeviceLoginRequest = z.infer<typeof DeviceLoginRequestSchema>;

/** POST /auth/register body (RegisterDTO). There is no `name`. */
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  /** Version of the terms / privacy policy the user agreed to. */
  consentVersion: z.string().optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

/**
 * POST /auth/reset-password. The route reads `password` and maps it to the
 * internal `newPassword` itself — sending `newPassword` is a 400.
 */
export const ResetPasswordRequestSchema = z.object({
  email: z.string().email(),
  resetToken: z.string().min(1),
  password: z.string().min(8),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
});
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

export const MagicLinkConsumeSchema = z.object({
  token: z.string().min(16).max(512),
});
export type MagicLinkConsume = z.infer<typeof MagicLinkConsumeSchema>;

/** POST /auth/otp/send — `action` is required (400 without it). */
export const OTPSendRequestSchema = z.object({
  method: OTPMethodEnum,
  action: OTPActionEnum,
});
export type OTPSendRequest = z.infer<typeof OTPSendRequestSchema>;

/** POST /auth/otp/verify. */
export const OTPVerifyRequestSchema = z.object({
  method: OTPMethodEnum,
  action: OTPActionEnum,
  otpToken: z.string().min(4),
});
export type OTPVerifyRequest = z.infer<typeof OTPVerifyRequestSchema>;

/** POST /auth/totp/enable and /disable — exactly six digits. */
export const TOTPCodeRequestSchema = z.object({
  otpToken: z.string().length(6),
});
export type TOTPCodeRequest = z.infer<typeof TOTPCodeRequestSchema>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

/** POST /auth/device/login (200) — the nine real fields. */
export const DeviceLoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  otpRequired: z.boolean(),
  user: SafeUserSchema,
  tenant: z.object({ tenantId: z.string(), name: z.string() }),
  tenantMember: z.object({ memberRole: MemberRoleEnum }),
  userSecurity: UserSecuritySchema,
  mustChangePassword: z.boolean(),
  passwordExpiresInDays: z.number().nullish(),
});
export type DeviceLoginResponse = z.infer<typeof DeviceLoginResponseSchema>;

/** POST /auth/device/refresh — both tokens rotate; store both. */
export const DeviceRefreshResponseSchema = z.object({
  message: z.string().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type DeviceRefreshResponse = z.infer<typeof DeviceRefreshResponseSchema>;

/** GET /auth/session. */
export const SessionResponseSchema = z.object({
  success: z.boolean(),
  user: SessionUserSchema,
  tenant: z.object({
    tenantId: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    tenantStatus: TenantStatusEnum,
  }),
  tenantMember: z.object({
    tenantMemberId: z.string(),
    memberRole: MemberRoleEnum,
    memberStatus: z.string(),
  }),
  message: z.string().optional(),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

/** POST /auth/register (201). */
export const RegisterResponseSchema = z.object({
  message: z.string(),
  user: z.object({ userId: z.string(), email: z.string() }),
  tenant: z.object({ tenantId: z.string(), name: z.string() }),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

/** GET /auth/me/sessions. */
export const SessionsListResponseSchema = z.object({
  sessions: z.array(SessionSchema).default([]),
});
export type SessionsListResponse = z.infer<typeof SessionsListResponseSchema>;

/** DELETE /auth/me/sessions/{id}. */
export const RevokeSessionResponseSchema = z.object({
  message: z.string().optional(),
  isCurrentSession: z.boolean().optional(),
});
export type RevokeSessionResponse = z.infer<typeof RevokeSessionResponseSchema>;

/** GET /auth/me/security. */
export const MeSecurityResponseSchema = z.object({
  message: z.string().optional(),
  userSecurity: UserSecuritySchema,
});
export type MeSecurityResponse = z.infer<typeof MeSecurityResponseSchema>;

export const TOTPSetupResponseSchema = z.object({
  message: z.string().optional(),
  secret: z.string(),
  otpauthUrl: z.string(),
});
export type TOTPSetupResponse = z.infer<typeof TOTPSetupResponseSchema>;

export const TOTPEnableResponseSchema = z.object({
  message: z.string().optional(),
  backupCodes: z.array(z.string()),
});
export type TOTPEnableResponse = z.infer<typeof TOTPEnableResponseSchema>;

/**
 * Endpoints whose body we do not consume (logout, forgot / reset / change
 * password, OTP send / verify, notification actions): `{ message }`, possibly
 * with extra keys. Parsed leniently so an acknowledgement never fails a flow.
 */
export const AckResponseSchema = z.object({ message: z.string().optional() }).passthrough();
export type AckResponse = z.infer<typeof AckResponseSchema>;
