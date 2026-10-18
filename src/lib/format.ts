const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

/**
 * Formats duration in milliseconds into `m:ss.d` (e.g. `0:49.8`, `1:05.2`).
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00.0";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

/** Legacy alias for formatDuration */
export const formatearMs = formatDuration;

/**
 * Formats speed in km/h with 1 decimal place (e.g. `24.5 km/h`).
 */
export function formatSpeed(kmh: number): string {
  if (!Number.isFinite(kmh) || kmh < 0) return "0.0 km/h";
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Formats distance in meters (e.g. `1250 m`).
 */
export function formatDistance(m: number): string {
  if (!Number.isFinite(m) || m < 0) return "0 m";
  return `${Math.round(m)} m`;
}

// "en-CA" writes dates as YYYY-MM-DD. The time zone is fixed to Mendoza so the day
// does not depend on where the code runs (a Vercel server runs in UTC).
const DIA_EN_MENDOZA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Mendoza",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Day of a moment in Mendoza time, as "YYYY-MM-DD".
 * MongoDB stores dates in UTC: a run at 23:47 in Mendoza is 02:47 UTC of the NEXT day,
 * so `toISOString().slice(0, 10)` would show tomorrow. This shows the real local day.
 */
export function diaEnMendoza(date: Date | number): string {
  return DIA_EN_MENDOZA.format(date);
}

// A bare "YYYY-MM-DD" string is read by `new Date()` as midnight UTC, which in
// Mendoza (UTC-3) is still the previous day. Build it as a local date instead.
function parseDate(value: string | number): Date {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

/**
 * Formats date into concise `es-AR` format (e.g. `12 sep 2026`).
 */
export function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : parseDate(date);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = MONTHS_ES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
