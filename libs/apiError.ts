import i18n from "@/libs/i18n";

// ============================================================================
// API error normalization
// next-boilerplate answers errors in four body shapes (route-error.ts plus a
// few hand-written routes); this collapses them into one object.
//   1. { message, code, details? }            AppError
//   2. { message: 'Validation error', issues } ZodError via normalizeError
//   3. { error: '<string>' }                   e.g. device login 403 / 404
//   4. { error: [<zod issues>] }               device login 400
// ============================================================================

export type ZodIssueLike = { message: string; path?: (string | number)[] };

export type NormalizedApiError = {
  /** Safe to show: translated for known server constants, else the server text or a generic line. */
  message: string;
  /** The server's own message string (e.g. "TOKEN_EXPIRED"), for control flow. */
  rawMessage?: string;
  code?: string;
  statusCode?: number;
  issues?: ZodIssueLike[];
  /** Seconds from a 429's Retry-After header. */
  retryAfter?: number;
  /** The plan blocks this feature or a limit was reached (feature_gate / billing) — show an upgrade state. */
  planGate?: boolean;
};

// feature_gate refusals are 403 FEATURE_NOT_AVAILABLE; billing adds quota / seat limits.
const PLAN_GATE_CODES = new Set(["FEATURE_NOT_AVAILABLE", "QUOTA_EXCEEDED", "SEAT_LIMIT_REACHED"]);

export function isPlanGateError(err: unknown): boolean {
  return normalizeApiError(err).planGate === true;
}

type AxiosLike = {
  isAxiosError?: boolean;
  message?: string;
  response?: { status?: number; data?: unknown; headers?: Record<string, unknown> };
};

// Server message constants (UserSessionMessages / AuthMessages) with a translation.
const KNOWN_MESSAGES = [
  "INVALID_CREDENTIALS",
  "USER_NOT_AUTHENTICATED",
  "USER_NOT_FOUND",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "SESSION_NOT_FOUND",
  "SESSION_EXPIRED",
  "SESSION_REVOKED",
  "REFRESH_TOKEN_REUSED",
  "OTP_REQUIRED",
  "INVALID_OTP",
  "OTP_EXPIRED",
  // auth_passkey
  "PASSKEY_LIMIT_REACHED",
  "PASSKEY_CHALLENGE_EXPIRED",
  "PASSKEY_REGISTRATION_FAILED",
  "PASSKEY_NOT_REGISTERED",
  "PASSKEY_AUTHENTICATION_FAILED",
  "PASSKEY_NOT_FOUND",
  "PASSKEY_LABEL_INVALID",
  "ACCOUNT_DISABLED",
] as const;

function isIssueArray(value: unknown): value is ZodIssueLike[] {
  return Array.isArray(value) && value.every((i) => i && typeof i === "object" && typeof (i as ZodIssueLike).message === "string");
}

function describeIssues(issues: ZodIssueLike[]): string {
  const first = issues[0];
  if (!first) return i18n.t("ERRORS.UNEXPECTED");
  const field = first.path?.filter((p) => typeof p === "string").join(".");
  return field ? `${field}: ${first.message}` : first.message;
}

function parseRetryAfter(headers?: Record<string, unknown>): number | undefined {
  const raw = headers?.["retry-after"] ?? headers?.["Retry-After"];
  const secs = Number(raw);
  return Number.isFinite(secs) && secs > 0 ? secs : undefined;
}

const HANDLED = Symbol.for("api-error.handled");

/** The transport already told the user (session ended, OTP gate) — screens should not toast again. */
export function markHandled<T>(err: T): T {
  if (err && typeof err === "object") (err as Record<symbol, boolean>)[HANDLED] = true;
  return err;
}

export function isHandled(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as Record<symbol, boolean>)[HANDLED]);
}

export function normalizeApiError(err: unknown): NormalizedApiError {
  const ax = (err && typeof err === "object" ? err : {}) as AxiosLike;

  if (ax.response) {
    const { status, headers } = ax.response;
    const data = (ax.response.data && typeof ax.response.data === "object" ? ax.response.data : {}) as {
      message?: unknown;
      code?: unknown;
      issues?: unknown;
      error?: unknown;
    };
    const code = typeof data.code === "string" ? data.code : undefined;
    const retryAfter = status === 429 ? parseRetryAfter(headers) : undefined;

    // Shapes 2 and 4: validation issues.
    const issues = isIssueArray(data.issues) ? data.issues : isIssueArray(data.error) ? data.error : undefined;
    if (issues) {
      return { message: describeIssues(issues), rawMessage: typeof data.message === "string" ? data.message : undefined, code, statusCode: status, issues };
    }

    // feature_gate / billing refusals carry English product copy: show the upgrade state instead.
    if (code && PLAN_GATE_CODES.has(code)) {
      return { message: i18n.t("ERRORS.PLAN_UPGRADE_REQUIRED"), rawMessage: typeof data.message === "string" ? data.message : undefined, code, statusCode: status, planGate: true };
    }

    // Shapes 1 and 3: a message string.
    const raw = typeof data.message === "string" ? data.message : typeof data.error === "string" ? data.error : undefined;
    if (status === 429) {
      return { message: i18n.t("ERRORS.RATE_LIMITED", { seconds: retryAfter ?? 60 }), rawMessage: raw, code, statusCode: status, retryAfter };
    }
    if (raw) {
      const known = (KNOWN_MESSAGES as readonly string[]).includes(raw);
      // Unknown SCREAMING_CASE constants are not user copy — fall back to the generic line.
      const message = known ? i18n.t(`API_ERRORS.${raw}`) : /^[A-Z0-9_]+$/.test(raw) ? i18n.t("ERRORS.UNEXPECTED") : raw;
      return { message, rawMessage: raw, code, statusCode: status };
    }
    return { message: i18n.t("ERRORS.UNEXPECTED"), code, statusCode: status };
  }

  // Request never got an answer (offline, DNS, timeout).
  if (ax.isAxiosError) return { message: i18n.t("ERRORS.NETWORK") };
  if (err instanceof Error && err.message) return { message: err.message };
  return { message: i18n.t("ERRORS.UNEXPECTED") };
}
