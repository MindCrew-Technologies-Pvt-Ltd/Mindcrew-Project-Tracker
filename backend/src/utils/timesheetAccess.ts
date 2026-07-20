import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

type AuthUser = { id: string; role?: string };

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
