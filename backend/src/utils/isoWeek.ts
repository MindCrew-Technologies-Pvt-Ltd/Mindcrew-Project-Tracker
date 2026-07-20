/**
 * ISO-8601 week helpers — single source of truth for the timesheet module.
 * Same algorithm as the frontend weekly-update page: weeks start Monday,
 * week 1 contains the year's first Thursday.
 */

export function isoWeekOf(date: Date): { isoYear: number; isoWeek: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = 1 + Math.round(((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getUTCDay() + 6) % 7)) / 7);
  return { isoYear, isoWeek };
}

/** Monday 00:00 UTC of the given ISO week. */
export function isoWeekStart(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7; // Mon=0
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7);
  return start;
}

/** The 7 dates (UTC midnight) of an ISO week, Monday first. */
export function isoWeekDates(isoYear: number, isoWeek: number): Date[] {
  const start = isoWeekStart(isoYear, isoWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
}

/** Normalize an incoming date (string) to UTC midnight of that calendar day. */
export function toUtcDateOnly(input: string | Date): Date {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
