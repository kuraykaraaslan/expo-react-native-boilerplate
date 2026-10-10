export type SuspendUntil = { ok: true; iso: string | undefined } | { ok: false };

/**
 * Parses the optional "until" field of the suspend form (`YYYY-MM-DD`, local date).
 * Empty means an open-ended suspension. The suspension lasts through the end of that day;
 * a date that is malformed, does not exist (2026-02-30) or is already past is rejected.
 */
export function parseSuspendUntil(text: string, now: number = Date.now()): SuspendUntil {
  const value = text.trim();
  if (!value) return { ok: true, iso: undefined };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return { ok: false };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const end = new Date(y, mo - 1, d, 23, 59, 59, 0);
  if (end.getFullYear() !== y || end.getMonth() !== mo - 1 || end.getDate() !== d) return { ok: false };
  if (end.getTime() <= now) return { ok: false };
  return { ok: true, iso: end.toISOString() };
}
