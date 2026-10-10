import { z } from "zod";

// ============================================================================
// Push tokens — mirror of next-boilerplate notification_push
// (notification_push.dto.ts: RegisterPushTokenDTO / UnregisterPushTokenQuery).
// ============================================================================

/** `ExponentPushToken[xxxx]` (current) or the older `ExpoPushToken[xxxx]` — the server rejects anything else. */
export const EXPO_TOKEN_RE = /^(Exponent|Expo)PushToken\[[^\]\s]+\]$/;

export const ExpoPushTokenSchema = z.string().max(512).regex(EXPO_TOKEN_RE, "Not an Expo push token");

export const PushPlatformSchema = z.enum(["ios", "android"]);
export type PushPlatform = z.infer<typeof PushPlatformSchema>;

/** `provider` is a closed list on the server: only `expo` has a sender behind it. */
export const RegisterPushTokenRequestSchema = z.object({
  provider: z.literal("expo"),
  token: ExpoPushTokenSchema,
  platform: PushPlatformSchema,
  /** The install id: a rotated token for the same device replaces the old row. */
  deviceId: z.string().min(1).max(128).optional(),
  appVersion: z.string().max(40).optional(),
  /** Empty or omitted means every category. */
  categories: z.array(z.string().max(64)).max(50).optional(),
});
export type RegisterPushTokenRequest = z.infer<typeof RegisterPushTokenRequestSchema>;

/** Unregister by install id (or token); the app uses the install id so no token travels in a URL. */
export const UnregisterPushTokenQuerySchema = z
  .object({
    deviceId: z.string().min(1).max(128).optional(),
    token: z.string().min(1).max(512).optional(),
  })
  .refine((q) => Boolean(q.deviceId) || Boolean(q.token), { message: "deviceId or token is required" });
export type UnregisterPushTokenQuery = z.infer<typeof UnregisterPushTokenQuerySchema>;

/**
 * What the server puts in the Expo message `data` (notification_push.expo.ts toExpoMessage): the payload's
 * `data` object plus `url` and `tag`. Messaging sends `{ conversationId, messageId }`, `url: /messaging/{id}` (a WEB path)
 * and `tag`. There is no tenant id in it. Everything is optional and unknown keys are ignored.
 */
export const PushDataSchema = z
  .object({
    conversationId: z.string().min(1).max(128).optional(),
    messageId: z.string().max(128).optional(),
    url: z.string().max(2048).optional(),
    tag: z.string().max(256).optional(),
  })
  .passthrough();
export type PushData = z.infer<typeof PushDataSchema>;
