// ============================================================================
// Audit log filter helpers. The server reads `fromDate` / `toDate` as inclusive
// bounds on `createdAt`, so a plain calendar day is widened to its whole UTC day.
// ============================================================================

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written as `YYYY-MM-DD` (rejects 2026-02-31). */
export function isValidDay(value: string): boolean {
  const m = DAY.exec(value.trim());
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Start of the given UTC day as an ISO datetime, or undefined when blank or invalid. */
export function dayStartIso(value: string): string | undefined {
  const v = value.trim();
  return isValidDay(v) ? `${v}T00:00:00.000Z` : undefined;
}

/** End of the given UTC day as an ISO datetime, or undefined when blank or invalid. */
export function dayEndIso(value: string): string | undefined {
  const v = value.trim();
  return isValidDay(v) ? `${v}T23:59:59.999Z` : undefined;
}

export type DateFilterError = "invalid" | "range" | null;

/** Validates the two optional day fields; `range` means from is after to. */
export function validateDayRange(from: string, to: string): { from: DateFilterError; to: DateFilterError } {
  const f = from.trim();
  const t = to.trim();
  const fromErr: DateFilterError = f && !isValidDay(f) ? "invalid" : null;
  const toErr: DateFilterError = t && !isValidDay(t) ? "invalid" : null;
  if (!fromErr && !toErr && f && t && f > t) return { from: null, to: "range" };
  return { from: fromErr, to: toErr };
}

/** Escapes `\`, `%` and `_` so the server's ILIKE substring match treats the text literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
