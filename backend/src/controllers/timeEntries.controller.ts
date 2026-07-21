import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { isoWeekOf, isoWeekDates, toUtcDateOnly, todayInOrgTz } from '../utils/isoWeek';
import { assertWeekUnlocked, assertDateEditable, assertDayCapacity, assertManualEntryAllowed, canReadUserTime, orgTimezone } from '../utils/timesheetAccess';

const sp = (v: string | string[]): string => (Array.isArray(v) ? v[0]! : v);
const qs = (v: unknown): string | undefined => (v && typeof v === 'string' ? v : undefined);

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
    // `today` (org timezone) drives the daily-lock UI: only that column is
    // editable. `manualEntryEnabled` tells the UI whether ANY manual writing
    // is allowed (AI-only mode hides add/edit/submit/timer entirely).
    const [today, settings] = await Promise.all([
      orgTimezone().then(todayInOrgTz),
      prisma.timesheetSettings.findUnique({ where: { id: 'singleton' }, select: { manualEntryEnabled: true } }),
    ]);
    success(res, {
      entries, week: envelope, dates: isoWeekDates(isoYear, isoWeek), holidays, today,
      manualEntryEnabled: req.user!.role === 'ADMIN' ? true : (settings?.manualEntryEnabled ?? false),
    });
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
    await assertManualEntryAllowed(req.user!);
    await assertDateEditable(day, req.user!);
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
    await assertManualEntryAllowed(req.user!);
    await assertDateEditable(existing.date, req.user!); // day of the entry itself
    await assertWeekUnlocked(existing.userId, existing.isoYear, existing.isoWeek);

    const { projectId, date, hours, minutes, description, billable } = req.body;
    const newDay = date !== undefined ? toUtcDateOnly(date) : existing.date;
    const { isoYear, isoWeek } = isoWeekOf(newDay);
    if (date !== undefined && newDay.getTime() !== existing.date.getTime()) {
      await assertDateEditable(newDay, req.user!); // moving INTO another day obeys the same rule
      await assertWeekUnlocked(existing.userId, isoYear, isoWeek);
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
    await assertManualEntryAllowed(req.user!);
    await assertDateEditable(existing.date, req.user!);
    await assertWeekUnlocked(existing.userId, existing.isoYear, existing.isoWeek);
    await prisma.timeEntry.delete({ where: { id } });
    success(res, null, 'Time entry deleted');
  } catch (err) { next(err); }
};

// copyWeek was removed: the daily-lock model (time is logged the same day only)
// makes copying a previous week's hours meaningless.
