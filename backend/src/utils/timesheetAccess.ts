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

/** Reject if adding `minutes` to the user's existing total for `date` exceeds 24h. */
export async function assertDayCapacity(userId: string, date: Date, minutes: number, excludeEntryId?: string): Promise<void> {
  const agg = await prisma.timeEntry.aggregate({
    where: { userId, date, ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}) },
    _sum: { minutes: true },
  });
  const dayTotal = (agg._sum.minutes ?? 0) + minutes;
  if (dayTotal > MAX_DAY_MINUTES) {
    throw new AppError('This would exceed 24 hours for that day', 400);
  }
  // Physical limit for TODAY: you cannot have worked more time than has
  // actually elapsed since midnight (org timezone). Stops an AI (or anyone)
  // from logging a "full day" at 2 PM by counting yesterday's work as today's.
  const tz = await orgTimezone();
  if (date.getTime() === todayInOrgTz(tz).getTime()) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const [h, m] = parts.split(':').map(Number);
    const elapsedMinutes = h * 60 + m;
    if (dayTotal > elapsedMinutes) {
      throw new AppError(
        `Too many hours for today: the day is only ${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m old and this would make today's total ${Math.floor(dayTotal / 60)}h ${dayTotal % 60}m. Only log time actually worked today — earlier days' work should have been logged on those days.`,
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
