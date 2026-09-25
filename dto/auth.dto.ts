import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────────

export const OTPMethodEnum = z.enum(["EMAIL", "SMS", "TOTP_APP"]);
export type OTPMethod = z.infer<typeof OTPMethodEnum>;

export const UserRoleEnum = z.enum(["GUEST", "USER", "ADMIN"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

// ── User ─────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  userId: z.string(),
  email: z.string().email().optional().nullable(),
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
  userRole: UserRoleEnum.default("USER"),
  language: z.string().optional().nullable(),
  theme: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export const SafeUserSchema = UserSchema;
export type User = z.infer<typeof UserSchema>;
export type SafeUser = z.infer<typeof SafeUserSchema>;

// ── Security ─────────────────────────────────────────────────────────────────

export const UserSecuritySchema = z.object({
  totpEnabled: z.boolean().default(false),
  otpMethods: z.array(OTPMethodEnum).default([]),
  passkeyCount: z.number().default(0),
  otpVerifyNeeded: z.boolean().default(false),
});
export type UserSecurity = z.infer<typeof UserSecuritySchema>;

// ── Session ───────────────────────────────────────────────────────────────────

export const SessionStatusEnum = z.enum(["ACTIVE", "REVOKED", "EXPIRED"]);
export type SessionStatus = z.infer<typeof SessionStatusEnum>;

export const SessionSchema = z.object({
  userSessionId: z.string(),
  userId: z.string(),
  userAgent: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  sessionStatus: SessionStatusEnum.optional(),
  otpVerifyNeeded: z.boolean().optional().nullable(),
  sessionExpiry: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});
export type Session = z.infer<typeof SessionSchema>;

// ── Request DTOs ──────────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const OTPSendRequestSchema = z.object({
  method: OTPMethodEnum,
});
export type OTPSendRequest = z.infer<typeof OTPSendRequestSchema>;

export const OTPVerifyRequestSchema = z.object({
  code: z.string().min(1),
  method: OTPMethodEnum,
});
export type OTPVerifyRequest = z.infer<typeof OTPVerifyRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ChangeEmailRequestSchema = z.object({
  newEmail: z.string().email(),
  otpCode: z.string().optional(),
});
export type ChangeEmailRequest = z.infer<typeof ChangeEmailRequestSchema>;

// ── Response DTOs ─────────────────────────────────────────────────────────────

export const LoginResponseSchema = z.object({
  user: SafeUserSchema,
  userSecurity: UserSecuritySchema.optional(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const SessionResponseSchema = z.object({
  user: SafeUserSchema,
  userSecurity: UserSecuritySchema.optional(),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const SessionsListResponseSchema = z.object({
  sessions: z.array(SessionSchema).default([]),
});
export type SessionsListResponse = z.infer<typeof SessionsListResponseSchema>;

// ── Device bearer (next-boilerplate auth/device/*) ───────────────────────────

/** Body of POST /auth/device/refresh — both tokens rotate on every refresh. */
export const DeviceTokenPairSchema = z.object({
  message: z.string().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type DeviceTokenPair = z.infer<typeof DeviceTokenPairSchema>;
