import { z } from "zod";
import { DeviceInfoSchema } from "@/services/auth/auth.dto";

// ============================================================================
// Passkey DTOs — mirror of next-boilerplate auth_passkey (auth_passkey.types.ts,
// the me/security/passkeys* routes and the device passkey login routes), READ FROM
// SOURCE 2026-10-10 (the server change is uncommitted in its working tree).
// WebAuthn payloads are the @simplewebauthn/server JSON shapes (v13).
// ============================================================================

// ── Management ────────────────────────────────────────────────────────────────

/** PasskeySummary — no public key, no counter. */
export const PasskeySchema = z.object({
  credentialId: z.string().min(1),
  label: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable().optional(),
  transports: z.array(z.string()).default([]),
});
export type Passkey = z.infer<typeof PasskeySchema>;

/** GET /auth/me/security/passkeys → `{ passkeys, backupGuidance }`. */
export const PasskeyListResponseSchema = z.object({
  passkeys: z.array(PasskeySchema),
  backupGuidance: z
    .object({
      passkeyCount: z.number(),
      /** Exactly one credential is registered: losing that authenticator locks the user out of passkey sign-in. */
      shouldAddBackup: z.boolean(),
      reason: z.string().nullable().optional(),
    })
    .optional(),
});
export type PasskeyListResponse = z.infer<typeof PasskeyListResponseSchema>;

/** PATCH …/passkeys/{credentialId} body (PasskeyRenameDTO: trimmed, 1-64 chars). */
export const PasskeyRenameRequestSchema = z.object({
  label: z.string().trim().min(1).max(64),
});
export type PasskeyRenameRequest = z.infer<typeof PasskeyRenameRequestSchema>;

/** PATCH …/passkeys/{credentialId} → `{ passkey, message }`. */
export const PasskeyRenameResponseSchema = z.object({ passkey: PasskeySchema });

/** POST …/passkeys/register/verify → `{ message, credentialId }`. */
export const PasskeyRegisterVerifyResponseSchema = z.object({ credentialId: z.string().min(1) });

// ── WebAuthn options (what the server hands the OS sheet) ─────────────────────

const DescriptorSchema = z.object({
  id: z.string().min(1),
  type: z.string().optional(),
  transports: z.array(z.string()).optional(),
});

const UserVerificationSchema = z.enum(["required", "preferred", "discouraged"]);

/** GET …/passkeys/register — PublicKeyCredentialCreationOptionsJSON (ids are base64url strings). */
export const PasskeyRegistrationOptionsSchema = z.object({
  challenge: z.string().min(1),
  rp: z.object({ id: z.string().min(1), name: z.string() }),
  user: z.object({ id: z.string().min(1), name: z.string(), displayName: z.string() }),
  pubKeyCredParams: z.array(z.object({ type: z.literal("public-key"), alg: z.number() })),
  timeout: z.number().optional(),
  excludeCredentials: z.array(DescriptorSchema).optional(),
  authenticatorSelection: z
    .object({
      authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
      requireResidentKey: z.boolean().optional(),
      residentKey: z.enum(["discouraged", "preferred", "required"]).optional(),
      userVerification: UserVerificationSchema.optional(),
    })
    .optional(),
  attestation: z.enum(["none", "indirect", "direct", "enterprise"]).optional(),
});
export type PasskeyRegistrationOptions = z.infer<typeof PasskeyRegistrationOptionsSchema>;

/** POST /auth/device/passkey/login/options — PublicKeyCredentialRequestOptionsJSON. */
export const PasskeyLoginOptionsSchema = z.object({
  challenge: z.string().min(1),
  rpId: z.string().min(1),
  timeout: z.number().optional(),
  allowCredentials: z.array(DescriptorSchema).optional(),
  userVerification: UserVerificationSchema.optional(),
});
export type PasskeyLoginOptions = z.infer<typeof PasskeyLoginOptionsSchema>;

/** POST …/passkey/login/options body (PasskeyLoginOptionsDTO). Omit `email` for a usernameless challenge. */
export const PasskeyLoginOptionsRequestSchema = z.object({ email: z.string().email().optional() });
export type PasskeyLoginOptionsRequest = z.infer<typeof PasskeyLoginOptionsRequestSchema>;

// ── Responses the app sends back (RegistrationResponseJSON / AuthenticationResponseJSON) ──

export const PasskeyRegistrationResponseSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  type: z.literal("public-key"),
  authenticatorAttachment: z.string().optional(),
  clientExtensionResults: z.record(z.string(), z.unknown()),
  response: z.object({
    clientDataJSON: z.string().min(1),
    attestationObject: z.string().min(1),
    authenticatorData: z.string().optional(),
    transports: z.array(z.string()).optional(),
    publicKeyAlgorithm: z.number().optional(),
    publicKey: z.string().optional(),
  }),
});
export type PasskeyRegistrationResponse = z.infer<typeof PasskeyRegistrationResponseSchema>;

export const PasskeyAssertionResponseSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  type: z.literal("public-key"),
  authenticatorAttachment: z.string().optional(),
  clientExtensionResults: z.record(z.string(), z.unknown()),
  response: z.object({
    clientDataJSON: z.string().min(1),
    authenticatorData: z.string().min(1),
    signature: z.string().min(1),
    userHandle: z.string().optional(),
  }),
});
export type PasskeyAssertionResponse = z.infer<typeof PasskeyAssertionResponseSchema>;

/** POST …/passkeys/register/verify body (PasskeyRegisterVerifyDTO). */
export const PasskeyRegisterVerifyRequestSchema = z.object({
  response: PasskeyRegistrationResponseSchema,
  label: z.string().max(120).optional(),
});
export type PasskeyRegisterVerifyRequest = z.infer<typeof PasskeyRegisterVerifyRequestSchema>;

/** POST /auth/device/passkey/login/verify body (PasskeyDeviceLoginVerifyDTO). Answers the SAME body as /auth/device/login. */
export const PasskeyLoginVerifyRequestSchema = z.object({
  response: PasskeyAssertionResponseSchema,
  email: z.string().email().optional(),
  device: DeviceInfoSchema.optional(),
});
export type PasskeyLoginVerifyRequest = z.infer<typeof PasskeyLoginVerifyRequestSchema>;
