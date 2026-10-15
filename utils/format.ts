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
  if (secs < 45) return i18n.t("common.date.justNow");
  const mins = Math.round(secs / 60);
  if (mins < 2) return i18n.t("common.date.aMinuteAgo");
  if (mins < 60) return i18n.t("common.date.minutesAgo", { time: mins });
  const hours = Math.round(mins / 60);
  if (hours < 2) return i18n.t("common.date.anHourAgo");
  if (hours < 24) return i18n.t("common.date.hoursAgo", { time: hours });
  const days = Math.round(hours / 24);
  if (days < 2) return i18n.t("common.date.aDayAgo");
  if (days < 7) return i18n.t("common.date.daysAgo", { time: days });
  return formatDate(iso);
}
