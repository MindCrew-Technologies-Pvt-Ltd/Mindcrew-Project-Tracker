import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { isoWeekOf, todayInOrgTz } from './isoWeek';

type AuthUser = { id: string; role?: string };

const MAX_DAY_MINUTES = 24 * 60;

/** The org timezone from settings (default Asia/Kolkata). */
export async function orgTimezone(): Promise<string> {
  const settings = await prisma.timesheetSettings.findUnique({ where: { id: 'singleton' }, select: { timezone: true } });
  return settings?.timezone || 'Asia/Kolkata';
}

/**
 * AI-only mode (the default): manual entry paths — add/edit/delete, timer,
 * manual submit — are blocked for non-admins. Time flows in exclusively via
 * connected AI assistants so nobody can doctor hours or descriptions.
 */
export async function assertManualEntryAllowed(user: AuthUser): Promise<void> {
  if (user.role === 'ADMIN') return;
  const settings = await prisma.timesheetSettings.findUnique({ where: { id: 'singleton' }, select: { manualEntryEnabled: true } });
  if (settings?.manualEntryEnabled) return;
  throw new AppError('Manual time entry is disabled — your connected AI assistant logs your work (see AI Integrations)', 403);
}

/**
 * Daily-lock rule: a day's time can only be logged/edited ON that day (org
 * timezone). Exceptions: the date's week envelope is REJECTED (the reviewer
 * sent it back for fixes), or the actor is an admin (corrections).
 */
export async function assertDateEditable(date: Date, user: AuthUser): Promise<void> {
  if (user.role === 'ADMIN') return;
  const today = todayInOrgTz(await orgTimezone());
  if (date.getTime() === today.getTime()) return;
  const { isoYear, isoWeek } = isoWeekOf(date);
  const envelope = await prisma.timesheetWeek.findUnique({
    where: { userId_isoYear_isoWeek: { userId: user.id, isoYear, isoWeek } },
    select: { status: true },
  });
  if (envelope?.status === 'REJECTED') return; // fix window after rejection
  throw new AppError(
    date.getTime() > today.getTime()
      ? 'Future days cannot be filled in advance'
      : 'This day is locked — time can only be logged on the same day',
    409,
  );
}

const HM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const hmToMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

/**
 * Reject if adding `minutes` to the user's existing total for `date` exceeds
 * 24h, or (for non-admin actors) exceeds the time elapsed since the day's
 * work start: the earliest AI-reported start ("HH:MM" org time — `startedHm`
 * on this call or `workStartedHm` on today's existing entries), falling back
 * to settings.workdayStartHour when no start was ever reported.
 */
export async function assertDayCapacity(userId: string, date: Date, minutes: number, excludeEntryId?: string, actor?: AuthUser, startedHm?: string | null): Promise<void> {
  const agg = await prisma.timeEntry.aggregate({
    where: { userId, date, ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}) },
    _sum: { minutes: true },
  });
  const dayTotal = (agg._sum.minutes ?? 0) + minutes;
  if (dayTotal > MAX_DAY_MINUTES) {
    throw new AppError('This would exceed 24 hours for that day', 400);
  }
  if (actor?.role === 'ADMIN') return; // admins may correct beyond the elapsed cap
  // Plausibility limit for TODAY: the day's total may not exceed the time
  // elapsed since the day's work START. The start adapts per day: the AI
  // reports when it first observed the user active (someone starting at 2 PM
  // can only log ~4h by 6 PM; a 9 AM starter can log 9h). Without any reported
  // start, fall back to settings.workdayStartHour (default 08:00 org time) —
  // capping against midnight let a "full 8h day" through at 2 PM.
  const settings = await prisma.timesheetSettings.findUnique({
    where: { id: 'singleton' }, select: { timezone: true, workdayStartHour: true },
  });
  const tz = settings?.timezone || 'Asia/Kolkata';
  if (date.getTime() === todayInOrgTz(tz).getTime()) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const [h, m] = parts.split(':').map(Number);
    const nowMin = h * 60 + m;
    if (startedHm != null) {
      if (!HM_RE.test(startedHm)) throw new AppError('started must be "HH:MM" 24-hour org time, e.g. "09:15"', 400);
      if (hmToMin(startedHm) > nowMin) throw new AppError('started cannot be in the future', 400);
    }
    const prevStart = await prisma.timeEntry.aggregate({
      where: { userId, date, workStartedHm: { not: null }, ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}) },
      _min: { workStartedHm: true }, // zero-padded "HH:MM" sorts chronologically
    });
    const reported = [startedHm, prevStart._min.workStartedHm].filter((s): s is string => !!s).map(hmToMin);
    const startMin = reported.length ? Math.min(...reported) : (settings?.workdayStartHour ?? 8) * 60;
    const startLabel = reported.length
      ? `work started at ${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`
      : `the workday starts at ${String(settings?.workdayStartHour ?? 8).padStart(2, '0')}:00 org time`;
    const elapsedMinutes = Math.max(0, nowMin - startMin);
    if (dayTotal > elapsedMinutes) {
      throw new AppError(
        `Too many hours for today: ${startLabel}, so only ${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m has elapsed, and this would make today's total ${Math.floor(dayTotal / 60)}h ${dayTotal % 60}m. Log only time ACTIVELY worked today, re-estimated honestly — do not retry with the maximum the server will accept.`,
        400,
      );
    }
  }
}

/** Is this user-week locked (SUBMITTED or APPROVED envelope exists)? */
export async function weekLocked(userId: string, isoYear: number, isoWeek: number): Promise<boolean> {
  const week = await prisma.timesheetWeek.findUnique({
    where: { userId_isoYear_isoWeek: { userId, isoYear, isoWeek } },
    select: { status: true },
  });
  return !!week && (week.status === 'SUBMITTED' || week.status === 'APPROVED');
}

/** Throw 409 if the user's week is locked — every entry write goes through this. */
export async function assertWeekUnlocked(userId: string, isoYear: number, isoWeek: number): Promise<void> {
  if (await weekLocked(userId, isoYear, isoWeek)) {
    throw new AppError('This week has been submitted for approval and is locked', 409);
  }
}

/**
 * May `user` review (approve/reject) this timesheet week?
 * Admin: always. Otherwise: user must own at least one project that appears
 * in the week's time entries.
 */
export async function assertWeekReviewer(
  week: { userId: string; isoYear: number; isoWeek: number },
  user: AuthUser,
): Promise<void> {
  if (user.role === 'ADMIN') return;
  if (week.userId === user.id) throw new AppError('You cannot review your own timesheet', 403);
  const ownedProjectWithTime = await prisma.timeEntry.findFirst({
    where: {
      userId: week.userId,
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
      project: { ownerId: user.id },
    },
    select: { id: true },
  });
  if (!ownedProjectWithTime) {
    throw new AppError('Only an owner of a project in this timesheet, or an admin, can review it', 403);
  }
}

/** Project ids owned by this user (for owner-scoped queues/reports). */
export async function ownedProjectIds(userId: string): Promise<string[]> {
  const rows = await prisma.project.findMany({ where: { ownerId: userId }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** May the user read another user's time data? (self, admin, or owner of ≥1 project) */
export async function canReadUserTime(targetUserId: string, user: AuthUser): Promise<boolean> {
  if (user.role === 'ADMIN' || targetUserId === user.id) return true;
  const owns = await prisma.project.findFirst({ where: { ownerId: user.id }, select: { id: true } });
  return !!owns;
}
