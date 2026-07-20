import dayjs from 'dayjs';

/** 90 → "1:30" */
export const minutesToHM = (minutes: number): string => {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};

/** 210 → "3h 30m" (for snackbars and totals prose) */
export const minutesToPretty = (minutes: number): string => {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  if (rest === 0) return `${h}h`;
  return `${h}h ${rest}m`;
};

/** 90 → "1.5" (decimal hours, for reports) */
export const minutesToHours = (minutes: number, digits = 1): string =>
  (minutes / 60).toFixed(digits).replace(/\.0+$/, '');

/**
 * Forgiving duration parser. Accepted forms → minutes:
 *   "5" → 300 · "5.5" → 330 · "5:30" → 330 · "5h30m" → 330 · "5h" → 300 · "90m" → 90
 * Empty input or a zero duration → null (meaning: clear the cell).
 * Anything unparsable (or > 24h) → NaN sentinel.
 */
export const parseDuration = (input: string): number | null => {
  const s = input.trim().toLowerCase();
  if (s === '') return null;
  let total: number;
  let m: RegExpExecArray | null;
  if ((m = /^(\d{1,2}):([0-5]?\d)$/.exec(s))) {
    total = Number(m[1]) * 60 + Number(m[2]);
  } else if ((m = /^(\d+(?:\.\d+)?)\s*h(?:\s*(\d{1,2})\s*m?)?$/.exec(s))) {
    total = Math.round(Number(m[1]) * 60) + (m[2] ? Number(m[2]) : 0);
  } else if ((m = /^(\d+)\s*m$/.exec(s))) {
    total = Number(m[1]);
  } else if (/^\d+(?:\.\d+)?$/.test(s)) {
    total = Math.round(Number(s) * 60);
  } else {
    return NaN;
  }
  if (!isFinite(total) || total > 24 * 60) return NaN;
  if (total === 0) return null;
  return total;
};

/** Split total minutes into the {hours, minutes} the API expects. */
export const splitMinutes = (total: number): { hours: number; minutes: number } => ({
  hours: Math.floor(total / 60),
  minutes: total % 60,
});

// ---- ISO week helpers ----

/** ISO-8601 week number + week-year for any given date (same algorithm as WeeklyUpdateNewPage). */
export const isoWeekOf = (date: Date): { week: number; year: number } => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = d.getTime();
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = 1 + Math.round(((firstThursday - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getUTCDay() + 6) % 7)) / 7);
  return { week, year: d.getUTCFullYear() };
};

/** The UTC Monday of a given ISO week (Jan 4 is always in week 1). */
export const mondayOfIsoWeek = (isoYear: number, isoWeek: number): Date => {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const dayNum = (jan4.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayNum + (isoWeek - 1) * 7);
  return monday;
};

/** The 7 UTC dates (Mon → Sun) of an ISO week. */
export const weekDates = (isoYear: number, isoWeek: number): Date[] => {
  const monday = mondayOfIsoWeek(isoYear, isoWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
};

/** Normalize a Date or ISO string to its "YYYY-MM-DD" key. */
export const dateKey = (d: Date | string): string =>
  typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);

/** Step an ISO week forward/backward by `delta` weeks. */
export const shiftIsoWeek = (isoYear: number, isoWeek: number, delta: number): { year: number; week: number } => {
  const monday = mondayOfIsoWeek(isoYear, isoWeek);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  // isoWeekOf reads local getFullYear/getMonth/getDate; feed it a local-midnight date instead.
  const local = new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate());
  return isoWeekOf(local);
};

/** "Week 29 · Jul 14 – Jul 20" */
export const weekLabel = (isoYear: number, isoWeek: number): string => {
  const dates = weekDates(isoYear, isoWeek);
  const start = dayjs(dateKey(dates[0]));
  const end = dayjs(dateKey(dates[6]));
  return `Week ${isoWeek} · ${start.format('MMM D')} – ${end.format('MMM D')}`;
};
