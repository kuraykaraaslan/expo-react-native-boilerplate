import i18n from "@/libs/i18n";

// ============================================================================
// Locale-aware date formatting (active i18next language)
// ============================================================================

function toDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** e.g. "24 Eyl 2026" / "Sep 24, 2026". Empty string when missing or invalid. */
export function formatDate(iso?: string | null): string {
  const d = toDate(iso);
  if (!d) return "";
  return d.toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" });
}

/** "5 minutes ago" style, from the DATE.* locale keys; falls back to formatDate after a week. */
export function formatRelative(iso?: string | null, now: number = Date.now()): string {
  const d = toDate(iso);
  if (!d) return "";
  const secs = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (secs < 45) return i18n.t("DATE.JUST_NOW");
  const mins = Math.round(secs / 60);
  if (mins < 2) return i18n.t("DATE.A_MINUTE_AGO");
  if (mins < 60) return i18n.t("DATE.MINUTES_AGO", { time: mins });
  const hours = Math.round(mins / 60);
  if (hours < 2) return i18n.t("DATE.AN_HOUR_AGO");
  if (hours < 24) return i18n.t("DATE.HOURS_AGO", { time: hours });
  const days = Math.round(hours / 24);
  if (days < 2) return i18n.t("DATE.A_DAY_AGO");
  if (days < 7) return i18n.t("DATE.DAYS_AGO", { time: days });
  return formatDate(iso);
}
