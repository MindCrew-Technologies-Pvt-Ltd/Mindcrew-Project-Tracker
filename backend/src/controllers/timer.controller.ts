import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { isoWeekOf, toUtcDateOnly } from '../utils/isoWeek';
import { assertWeekUnlocked, assertManualEntryAllowed } from '../utils/timesheetAccess';

/** Cap a single running span at 12h so a forgotten timer can't log days of time. */
const MAX_SPAN_MINUTES = 12 * 60;

function elapsedMinutes(timer: { startedAt: Date; accumulatedMin: number; isPaused: boolean }): number {
  if (timer.isPaused) return timer.accumulatedMin;
  const span = Math.floor((Date.now() - timer.startedAt.getTime()) / 60000);
  return timer.accumulatedMin + Math.min(span, MAX_SPAN_MINUTES);
}

export const getTimer: RequestHandler = async (req, res, next) => {
  try {
    const [timer, settings] = await Promise.all([
      prisma.activeTimer.findUnique({
        where: { userId: req.user!.id },
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.timesheetSettings.findUnique({ where: { id: 'singleton' }, select: { manualEntryEnabled: true } }),
    ]);
    success(res, {
      timer: timer ? { ...timer, elapsedMinutes: elapsedMinutes(timer) } : null,
      // AI-only mode hides the timer widget for non-admins (server also blocks start)
      manualEntryEnabled: req.user!.role === 'ADMIN' ? true : (settings?.manualEntryEnabled ?? false),
    });
  } catch (err) { next(err); }
};

export const startTimer: RequestHandler = async (req, res, next) => {
  try {
    await assertManualEntryAllowed(req.user!); // the timer is a manual write path
    const { projectId, description, billable } = req.body;
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) return next(new AppError('Project not found', 404));
    const existing = await prisma.activeTimer.findUnique({ where: { userId: req.user!.id } });
    if (existing) { error(res, 'You already have a timer running — stop or discard it first', 409); return; }
    const timer = await prisma.activeTimer.create({
      data: { userId: req.user!.id, projectId, description, billable: billable ?? true },
      include: { project: { select: { id: true, name: true } } },
    });
    success(res, { ...timer, elapsedMinutes: 0 }, 'Timer started', 201);
  } catch (err) { next(err); }
};

export const pauseTimer: RequestHandler = async (req, res, next) => {
  try {
    const timer = await prisma.activeTimer.findUnique({ where: { userId: req.user!.id } });
    if (!timer) return next(new AppError('No timer running', 404));
    if (timer.isPaused) { error(res, 'Timer is already paused', 400); return; }
    const updated = await prisma.activeTimer.update({
      where: { userId: req.user!.id },
      data: { accumulatedMin: elapsedMinutes(timer), isPaused: true },
      include: { project: { select: { id: true, name: true } } },
    });
    success(res, { ...updated, elapsedMinutes: updated.accumulatedMin });
  } catch (err) { next(err); }
};

export const resumeTimer: RequestHandler = async (req, res, next) => {
  try {
    const timer = await prisma.activeTimer.findUnique({ where: { userId: req.user!.id } });
    if (!timer) return next(new AppError('No timer running', 404));
    if (!timer.isPaused) { error(res, 'Timer is not paused', 400); return; }
    const updated = await prisma.activeTimer.update({
      where: { userId: req.user!.id },
      data: { isPaused: false, startedAt: new Date() },
      include: { project: { select: { id: true, name: true } } },
    });
    success(res, { ...updated, elapsedMinutes: elapsedMinutes(updated) });
  } catch (err) { next(err); }
};

/** Stop → the accumulated time becomes a draft TimeEntry for today. */
export const stopTimer: RequestHandler = async (req, res, next) => {
  try {
    const timer = await prisma.activeTimer.findUnique({ where: { userId: req.user!.id } });
    if (!timer) return next(new AppError('No timer running', 404));
    const total = Math.max(1, elapsedMinutes(timer)); // at least 1 minute
    const today = toUtcDateOnly(new Date());
    const { isoYear, isoWeek } = isoWeekOf(today);
    await assertWeekUnlocked(req.user!.id, isoYear, isoWeek);
    const [entry] = await prisma.$transaction([
      prisma.timeEntry.create({
        data: {
          userId: req.user!.id, projectId: timer.projectId, date: today, minutes: total,
          description: timer.description, billable: timer.billable, isoYear, isoWeek, source: 'TIMER',
        },
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.activeTimer.delete({ where: { userId: req.user!.id } }),
    ]);
    success(res, entry, 'Timer saved as a time entry', 201);
  } catch (err) { next(err); }
};

export const discardTimer: RequestHandler = async (req, res, next) => {
  try {
    const timer = await prisma.activeTimer.findUnique({ where: { userId: req.user!.id } });
    if (!timer) return next(new AppError('No timer running', 404));
    await prisma.activeTimer.delete({ where: { userId: req.user!.id } });
    success(res, null, 'Timer discarded');
  } catch (err) { next(err); }
};
