import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error, paginated } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { createNotification } from '../utils/notifications';
import { getPaginationParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { isoWeekDates } from '../utils/isoWeek';
import { assertWeekReviewer, ownedProjectIds } from '../utils/timesheetAccess';

const sp = (v: string | string[]): string => (Array.isArray(v) ? v[0]! : v);
const qs = (v: unknown): string | undefined => (v && typeof v === 'string' ? v : undefined);

function weekLabel(isoYear: number, isoWeek: number): string {
  const [start, , , , , , end] = isoWeekDates(isoYear, isoWeek);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `W${isoWeek} ${isoYear} (${fmt(start)} – ${fmt(end)})`;
}

/**
 * Core submission: creates/updates the SUBMITTED envelope and notifies the
 * owners of every project included. Used by the HTTP handler AND the Monday
 * auto-submit cron. Throws AppError on empty week / already submitted.
 */
export async function submitWeekForUser(
  userId: string,
  isoYear: number,
  isoWeek: number,
  opts: { auto?: boolean } = {},
) {
  const entries = await prisma.timeEntry.findMany({ where: { userId, isoYear, isoWeek } });
  if (entries.length === 0) throw new AppError('Nothing to submit — this week has no time entries', 400);
  const existing = await prisma.timesheetWeek.findUnique({
    where: { userId_isoYear_isoWeek: { userId, isoYear, isoWeek } },
  });
  if (existing && (existing.status === 'SUBMITTED' || existing.status === 'APPROVED')) {
    throw new AppError(`This week is already ${existing.status.toLowerCase()}`, 409);
  }
  // A rejected week is never auto-resubmitted — the person must fix it first.
  if (opts.auto && existing?.status === 'REJECTED') {
    throw new AppError('Week was rejected — needs manual resubmission', 409);
  }
  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const week = await prisma.timesheetWeek.upsert({
    where: { userId_isoYear_isoWeek: { userId, isoYear, isoWeek } },
    update: { status: 'SUBMITTED', totalMinutes, submittedAt: new Date(), reviewedById: null, reviewedAt: null, reviewNote: null },
    create: { userId, isoYear, isoWeek, status: 'SUBMITTED', totalMinutes },
  });
  await logActivity({
    userId, action: opts.auto ? 'AUTO_SUBMIT' : 'SUBMIT', module: 'TIMESHEET',
    description: `${opts.auto ? 'Auto-submitted' : 'Submitted'} timesheet ${weekLabel(isoYear, isoWeek)} (${Math.round(totalMinutes / 6) / 10}h)`,
  });

  const projectIds = [...new Set(entries.map((e) => e.projectId))];
  const owners = await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { ownerId: true, name: true } });
  const ownerIds = [...new Set(owners.map((o) => o.ownerId))].filter((id) => id !== userId);
  const submitter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await Promise.all(ownerIds.map((ownerId) =>
    createNotification({
      userId: ownerId,
      title: 'Timesheet submitted',
      message: `${submitter?.name ?? 'A team member'} submitted their timesheet for ${weekLabel(isoYear, isoWeek)} — review it under Timesheet → Approvals.`,
      type: 'TIMESHEET',
      relatedId: week.id,
    })));
  return week;
}

/** Submit (or resubmit) my week for approval. */
export const submitWeek: RequestHandler = async (req, res, next) => {
  try {
    const { isoYear, isoWeek } = req.body;
    const week = await submitWeekForUser(req.user!.id, isoYear, isoWeek);
    success(res, week, 'Timesheet submitted for approval', 201);
  } catch (err) { next(err); }
};

export const myWeeks: RequestHandler = async (req, res, next) => {
  try {
    const year = qs(req.query.year) ? Number(qs(req.query.year)) : undefined;
    const weeks = await prisma.timesheetWeek.findMany({
      where: { userId: req.user!.id, ...(year ? { isoYear: year } : {}) },
      orderBy: [{ isoYear: 'desc' }, { isoWeek: 'desc' }],
      take: 60,
      include: { reviewedBy: { select: { id: true, name: true } } },
    });
    success(res, weeks);
  } catch (err) { next(err); }
};

/** Approvals queue: submitted weeks whose entries touch a project I own (admin: all). */
export const pendingWeeks: RequestHandler = async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = getPaginationParams(req.query as Record<string, unknown>);
    const status = (qs(req.query.status) ?? 'SUBMITTED') as 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    let userFilter: Record<string, unknown> = {};
    if (req.user!.role !== 'ADMIN') {
      const myProjects = await ownedProjectIds(req.user!.id);
      if (myProjects.length === 0) { paginated(res, [], 0, page, pageSize); return; }
      const authors = await prisma.timeEntry.findMany({
        where: { projectId: { in: myProjects } },
        select: { userId: true },
        distinct: ['userId'],
      });
      userFilter = { userId: { in: authors.map((a) => a.userId).filter((id) => id !== req.user!.id) } };
    }
    const where = { status, ...userFilter };
    const [items, total] = await Promise.all([
      prisma.timesheetWeek.findMany({
        where, skip, take,
        orderBy: { submittedAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } }, reviewedBy: { select: { id: true, name: true } } },
      }),
      prisma.timesheetWeek.count({ where }),
    ]);
    // Attach per-week project chips + billable split for the queue table.
    const enriched = await Promise.all(items.map(async (w) => {
      const entries = await prisma.timeEntry.findMany({
        where: { userId: w.userId, isoYear: w.isoYear, isoWeek: w.isoWeek },
        include: { project: { select: { id: true, name: true } } },
      });
      const billableMinutes = entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0);
      const projects = [...new Map(entries.map((e) => [e.project.id, e.project])).values()];
      return { ...w, entryCount: entries.length, billableMinutes, projects, label: weekLabel(w.isoYear, w.isoWeek) };
    }));
    paginated(res, enriched, total, page, pageSize);
  } catch (err) { next(err); }
};

export const getWeekDetail: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const week = await prisma.timesheetWeek.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } }, reviewedBy: { select: { id: true, name: true } } },
    });
    if (!week) return next(new AppError('Timesheet not found', 404));
    if (week.userId !== req.user!.id) await assertWeekReviewer(week, req.user!);
    const entries = await prisma.timeEntry.findMany({
      where: { userId: week.userId, isoYear: week.isoYear, isoWeek: week.isoWeek },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      include: { project: { select: { id: true, name: true } } },
    });
    success(res, { ...week, entries, dates: isoWeekDates(week.isoYear, week.isoWeek), label: weekLabel(week.isoYear, week.isoWeek) });
  } catch (err) { next(err); }
};

export const approveWeek: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const week = await prisma.timesheetWeek.findUnique({ where: { id } });
    if (!week) return next(new AppError('Timesheet not found', 404));
    await assertWeekReviewer(week, req.user!);
    if (week.status !== 'SUBMITTED') { error(res, 'Only submitted timesheets can be approved', 400); return; }
    const updated = await prisma.timesheetWeek.update({
      where: { id },
      data: { status: 'APPROVED', reviewedById: req.user!.id, reviewedAt: new Date(), reviewNote: null },
    });
    await logActivity({ userId: req.user!.id, action: 'APPROVE', module: 'TIMESHEET', description: `Approved timesheet ${weekLabel(week.isoYear, week.isoWeek)} of user ${week.userId}` });
    await createNotification({
      userId: week.userId, title: 'Timesheet approved',
      message: `Your timesheet for ${weekLabel(week.isoYear, week.isoWeek)} was approved.`,
      type: 'TIMESHEET', relatedId: id,
    });
    success(res, updated);
  } catch (err) { next(err); }
};

export const rejectWeek: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const { note } = req.body;
    const week = await prisma.timesheetWeek.findUnique({ where: { id } });
    if (!week) return next(new AppError('Timesheet not found', 404));
    await assertWeekReviewer(week, req.user!);
    if (week.status !== 'SUBMITTED') { error(res, 'Only submitted timesheets can be rejected', 400); return; }
    const updated = await prisma.timesheetWeek.update({
      where: { id },
      data: { status: 'REJECTED', reviewedById: req.user!.id, reviewedAt: new Date(), reviewNote: note },
    });
    await logActivity({ userId: req.user!.id, action: 'REJECT', module: 'TIMESHEET', description: `Rejected timesheet ${weekLabel(week.isoYear, week.isoWeek)} of user ${week.userId}: ${note}` });
    await createNotification({
      userId: week.userId, title: 'Timesheet rejected',
      message: `Your timesheet for ${weekLabel(week.isoYear, week.isoWeek)} was rejected: "${note}". Fix the entries and resubmit.`,
      type: 'TIMESHEET', relatedId: id,
    });
    success(res, updated);
  } catch (err) { next(err); }
};

/** Admin-only: unlock an approved week so the user can correct it. */
export const reopenWeek: RequestHandler = async (req, res, next) => {
  try {
    if (req.user!.role !== 'ADMIN') return next(new AppError('Only an admin can reopen an approved timesheet', 403));
    const id = sp(req.params.id);
    const week = await prisma.timesheetWeek.findUnique({ where: { id } });
    if (!week) return next(new AppError('Timesheet not found', 404));
    if (week.status !== 'APPROVED') { error(res, 'Only approved timesheets can be reopened', 400); return; }
    const updated = await prisma.timesheetWeek.update({
      where: { id },
      data: { status: 'REJECTED', reviewedById: req.user!.id, reviewedAt: new Date(), reviewNote: 'Reopened by admin for corrections' },
    });
    await logActivity({ userId: req.user!.id, action: 'REOPEN', module: 'TIMESHEET', description: `Reopened approved timesheet ${weekLabel(week.isoYear, week.isoWeek)} of user ${week.userId}` });
    await createNotification({
      userId: week.userId, title: 'Timesheet reopened',
      message: `Your approved timesheet for ${weekLabel(week.isoYear, week.isoWeek)} was reopened by an admin — you can edit and resubmit it.`,
      type: 'TIMESHEET', relatedId: id,
    });
    success(res, updated);
  } catch (err) { next(err); }
};

/** Users with zero entries for a week (owner: their project members; admin: all active users). */
export const missingWeek: RequestHandler = async (req, res, next) => {
  try {
    const isoYear = Number(qs(req.query.isoYear));
    const isoWeek = Number(qs(req.query.isoWeek));
    if (!isoYear || !isoWeek) return next(new AppError('isoYear and isoWeek are required', 400));
    let candidateIds: string[] | null = null;
    if (req.user!.role !== 'ADMIN') {
      const myProjects = await ownedProjectIds(req.user!.id);
      if (myProjects.length === 0) { success(res, []); return; }
      const members = await prisma.projectMember.findMany({ where: { projectId: { in: myProjects } }, select: { userId: true } });
      candidateIds = [...new Set(members.map((m) => m.userId))].filter((id) => id !== req.user!.id);
      if (candidateIds.length === 0) { success(res, []); return; }
    }
    const users = await prisma.user.findMany({
      where: { isActive: true, ...(candidateIds ? { id: { in: candidateIds } } : {}) },
      select: { id: true, name: true, email: true },
    });
    const logged = await prisma.timeEntry.findMany({
      where: { isoYear, isoWeek, userId: { in: users.map((u) => u.id) } },
      select: { userId: true }, distinct: ['userId'],
    });
    const loggedSet = new Set(logged.map((l) => l.userId));
    success(res, users.filter((u) => !loggedSet.has(u.id)));
  } catch (err) { next(err); }
};
