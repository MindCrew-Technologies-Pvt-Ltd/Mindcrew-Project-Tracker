import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { isoWeekOf, isoWeekDates, toUtcDateOnly } from '../utils/isoWeek';
import { assertWeekUnlocked, canReadUserTime } from '../utils/timesheetAccess';

const sp = (v: string | string[]): string => (Array.isArray(v) ? v[0]! : v);
const qs = (v: unknown): string | undefined => (v && typeof v === 'string' ? v : undefined);

const MAX_DAY_MINUTES = 24 * 60;

/** Reject if adding `minutes` to the user's existing total for `date` exceeds 24h. */
async function assertDayCapacity(userId: string, date: Date, minutes: number, excludeEntryId?: string) {
  const agg = await prisma.timeEntry.aggregate({
    where: { userId, date, ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}) },
    _sum: { minutes: true },
  });
  if ((agg._sum.minutes ?? 0) + minutes > MAX_DAY_MINUTES) {
    throw new AppError('This would exceed 24 hours for that day', 400);
  }
}

export const getTimeEntries: RequestHandler = async (req, res, next) => {
  try {
    const from = qs(req.query.from);
    const to = qs(req.query.to);
    const projectId = qs(req.query.projectId);
    const targetUserId = qs(req.query.userId) ?? req.user!.id;
    if (targetUserId !== req.user!.id && !(await canReadUserTime(targetUserId, req.user!))) {
      return next(new AppError('Forbidden', 403));
    }
    const entries = await prisma.timeEntry.findMany({
      where: {
        userId: targetUserId,
        ...(projectId ? { projectId } : {}),
        ...(from || to
          ? { date: { ...(from ? { gte: toUtcDateOnly(from) } : {}), ...(to ? { lte: toUtcDateOnly(to) } : {}) } }
          : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
      include: { project: { select: { id: true, name: true } } },
    });
    success(res, entries);
  } catch (err) { next(err); }
};

/** The weekly-grid payload: entries + envelope status + the 7 dates of the week. */
export const getWeekEntries: RequestHandler = async (req, res, next) => {
  try {
    const isoYear = Number(qs(req.query.isoYear));
    const isoWeek = Number(qs(req.query.isoWeek));
    if (!isoYear || !isoWeek) return next(new AppError('isoYear and isoWeek are required', 400));
    const targetUserId = qs(req.query.userId) ?? req.user!.id;
    if (targetUserId !== req.user!.id && !(await canReadUserTime(targetUserId, req.user!))) {
      return next(new AppError('Forbidden', 403));
    }
    const [entries, envelope, holidays] = await Promise.all([
      prisma.timeEntry.findMany({
        where: { userId: targetUserId, isoYear, isoWeek },
        orderBy: { createdAt: 'asc' },
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.timesheetWeek.findUnique({
        where: { userId_isoYear_isoWeek: { userId: targetUserId, isoYear, isoWeek } },
        include: { reviewedBy: { select: { id: true, name: true } } },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: isoWeekDates(isoYear, isoWeek)[0], lte: isoWeekDates(isoYear, isoWeek)[6] } },
      }),
    ]);
    success(res, { entries, week: envelope, dates: isoWeekDates(isoYear, isoWeek), holidays });
  } catch (err) { next(err); }
};

export const createTimeEntry: RequestHandler = async (req, res, next) => {
  try {
    const { projectId, date, hours, minutes, description, billable } = req.body;
    const day = toUtcDateOnly(date);
    const totalMinutes = hours * 60 + minutes;
    const { isoYear, isoWeek } = isoWeekOf(day);
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return next(new AppError('Project not found', 404));
    await assertWeekUnlocked(req.user!.id, isoYear, isoWeek);
    await assertDayCapacity(req.user!.id, day, totalMinutes);
    const entry = await prisma.timeEntry.create({
      data: {
        userId: req.user!.id, projectId, date: day, minutes: totalMinutes,
        description, billable: billable ?? true, isoYear, isoWeek, source: 'MANUAL',
      },
      include: { project: { select: { id: true, name: true } } },
    });
    success(res, entry, 'Time entry created', 201);
  } catch (err) { next(err); }
};

export const updateTimeEntry: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Time entry not found', 404));
    if (existing.userId !== req.user!.id) return next(new AppError('You can only edit your own time entries', 403));
    await assertWeekUnlocked(existing.userId, existing.isoYear, existing.isoWeek);

    const { projectId, date, hours, minutes, description, billable } = req.body;
    const newDay = date !== undefined ? toUtcDateOnly(date) : existing.date;
    const { isoYear, isoWeek } = isoWeekOf(newDay);
    if (date !== undefined && (isoYear !== existing.isoYear || isoWeek !== existing.isoWeek)) {
      await assertWeekUnlocked(existing.userId, isoYear, isoWeek); // moving INTO a locked week is also blocked
    }
    const newMinutes = hours !== undefined && minutes !== undefined ? hours * 60 + minutes : existing.minutes;
    if (newMinutes < 1) { error(res, 'Entry must be at least 1 minute', 400); return; }
    await assertDayCapacity(existing.userId, newDay, newMinutes, id);
    if (projectId !== undefined) {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!project) return next(new AppError('Project not found', 404));
    }
    const entry = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...(projectId !== undefined && { projectId }),
        ...(date !== undefined && { date: newDay, isoYear, isoWeek }),
        minutes: newMinutes,
        ...(description !== undefined && { description }),
        ...(billable !== undefined && { billable }),
      },
      include: { project: { select: { id: true, name: true } } },
    });
    success(res, entry);
  } catch (err) { next(err); }
};

export const deleteTimeEntry: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Time entry not found', 404));
    if (existing.userId !== req.user!.id) return next(new AppError('You can only delete your own time entries', 403));
    await assertWeekUnlocked(existing.userId, existing.isoYear, existing.isoWeek);
    await prisma.timeEntry.delete({ where: { id } });
    success(res, null, 'Time entry deleted');
  } catch (err) { next(err); }
};

/** Copy own entries from one week into another (skips project+day cells that already have time). */
export const copyWeek: RequestHandler = async (req, res, next) => {
  try {
    const { fromIsoYear, fromIsoWeek, toIsoYear, toIsoWeek } = req.body;
    if (fromIsoYear === toIsoYear && fromIsoWeek === toIsoWeek) { error(res, 'Source and target week are the same', 400); return; }
    await assertWeekUnlocked(req.user!.id, toIsoYear, toIsoWeek);
    const [sourceEntries, targetEntries] = await Promise.all([
      prisma.timeEntry.findMany({ where: { userId: req.user!.id, isoYear: fromIsoYear, isoWeek: fromIsoWeek } }),
      prisma.timeEntry.findMany({ where: { userId: req.user!.id, isoYear: toIsoYear, isoWeek: toIsoWeek } }),
    ]);
    if (sourceEntries.length === 0) { error(res, 'The source week has no entries to copy', 400); return; }
    const sourceDates = isoWeekDates(fromIsoYear, fromIsoWeek).map((d) => d.getTime());
    const targetDates = isoWeekDates(toIsoYear, toIsoWeek);
    const occupied = new Set(targetEntries.map((e) => `${e.projectId}|${e.date.getTime()}`));
    const toCreate = sourceEntries.flatMap((e) => {
      const dayIndex = sourceDates.indexOf(e.date.getTime());
      if (dayIndex === -1) return [];
      const targetDate = targetDates[dayIndex];
      if (occupied.has(`${e.projectId}|${targetDate.getTime()}`)) return [];
      return [{
        userId: e.userId, projectId: e.projectId, date: targetDate, minutes: e.minutes,
        billable: e.billable, isoYear: toIsoYear, isoWeek: toIsoWeek, source: 'COPY',
      }];
    });
    if (toCreate.length === 0) { error(res, 'Nothing to copy — the target week already has entries for those projects', 400); return; }
    await prisma.timeEntry.createMany({ data: toCreate });
    await logActivity({ userId: req.user!.id, action: 'COPY_WEEK', module: 'TIMESHEET', description: `Copied ${toCreate.length} entries from W${fromIsoWeek}/${fromIsoYear} to W${toIsoWeek}/${toIsoYear}` });
    success(res, { copied: toCreate.length }, `${toCreate.length} entries copied`, 201);
  } catch (err) { next(err); }
};
