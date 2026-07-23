import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error, paginated } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { createNotification } from '../utils/notifications';
import { getPaginationParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { isoWeekDates, isoWeekOf, toUtcDateOnly } from '../utils/isoWeek';
import { assertWeekReviewer, assertManualEntryAllowed, ownedProjectIds } from '../utils/timesheetAccess';

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

/** Submit (or resubmit) my week for approval. In AI-only mode weeks are
 *  auto-submitted every Monday — manual submission is admin-only. */
export const submitWeek: RequestHandler = async (req, res, next) => {
  try {
    await assertManualEntryAllowed(req.user!);
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

/**
 * Admin-only: everyone's entries for one calendar day, grouped per user, with
 * that day's week envelope so the admin can approve/reject from the daily view.
 * Also lists active non-admin users with nothing logged that day.
 */
export const dailyAllUsers: RequestHandler = async (req, res, next) => {
  try {
    const dateRaw = qs(req.query.date);
    if (!dateRaw) return next(new AppError('date is required (YYYY-MM-DD)', 400));
    const day = toUtcDateOnly(dateRaw);
    if (isNaN(day.getTime())) return next(new AppError('Invalid date', 400));
    const { isoYear, isoWeek } = isoWeekOf(day);

    const entries = await prisma.timeEntry.findMany({
      where: { date: day },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });
    const userIds = [...new Set(entries.map((e) => e.userId))];
    const envelopes = await prisma.timesheetWeek.findMany({
      where: { isoYear, isoWeek, userId: { in: userIds } },
      include: { reviewedBy: { select: { id: true, name: true } } },
    });
    const envMap = new Map(envelopes.map((w) => [w.userId, w]));

    const byUser = new Map<string, { user: { id: string; name: string; email: string }; entries: typeof entries; totalMinutes: number }>();
    for (const e of entries) {
      const row = byUser.get(e.userId) ?? { user: e.user, entries: [] as typeof entries, totalMinutes: 0 };
      row.entries.push(e);
      row.totalMinutes += e.minutes;
      byUser.set(e.userId, row);
    }
    const rows = [...byUser.values()]
      .map((r) => ({ ...r, week: envMap.get(r.user.id) ?? null }))
      .sort((a, b) => a.user.name.localeCompare(b.user.name));

    const activeUsers = await prisma.user.findMany({
      where: { isActive: true, role: { not: 'ADMIN' } },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    const loggedSet = new Set(userIds);
    const missing = activeUsers.filter((u) => !loggedSet.has(u.id));

    success(res, { date: day, isoYear, isoWeek, rows, missing });
  } catch (err) { next(err); }
};

/**
 * Admin-only: approve or reject a user's week directly (by user + week, no
 * prior submission required — the envelope is created if it doesn't exist).
 * Rejecting reopens the week on the user's side with the note shown.
 */
export const reviewWeek: RequestHandler = async (req, res, next) => {
  try {
    const { userId, isoYear, isoWeek, action, note } = req.body as
      { userId: string; isoYear: number; isoWeek: number; action: 'approve' | 'reject'; note?: string };
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!target) return next(new AppError('User not found', 404));
    const entries = await prisma.timeEntry.findMany({ where: { userId, isoYear, isoWeek } });
    if (entries.length === 0) return next(new AppError('This week has no time entries to review', 400));
    const existing = await prisma.timesheetWeek.findUnique({
      where: { userId_isoYear_isoWeek: { userId, isoYear, isoWeek } },
    });
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    if (existing?.status === newStatus) {
      return next(new AppError(`This week is already ${newStatus.toLowerCase()}`, 409));
    }
    const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
    const week = await prisma.timesheetWeek.upsert({
      where: { userId_isoYear_isoWeek: { userId, isoYear, isoWeek } },
      update: {
        status: newStatus, totalMinutes,
        reviewedById: req.user!.id, reviewedAt: new Date(),
        reviewNote: action === 'reject' ? note : null,
      },
      create: {
        userId, isoYear, isoWeek, status: newStatus, totalMinutes,
        submittedAt: new Date(),
        reviewedById: req.user!.id, reviewedAt: new Date(),
        reviewNote: action === 'reject' ? note : null,
      },
    });
    await logActivity({
      userId: req.user!.id, action: action === 'approve' ? 'APPROVE' : 'REJECT', module: 'TIMESHEET',
      description: `${action === 'approve' ? 'Approved' : 'Rejected'} timesheet ${weekLabel(isoYear, isoWeek)} of ${target.name}${note ? `: ${note}` : ''}`,
    });
    await createNotification({
      userId, type: 'TIMESHEET', relatedId: week.id,
      title: action === 'approve' ? 'Timesheet approved' : 'Timesheet rejected',
      message: action === 'approve'
        ? `Your timesheet for ${weekLabel(isoYear, isoWeek)} was approved.`
        : `Your timesheet for ${weekLabel(isoYear, isoWeek)} was rejected: "${note}". Ask your AI assistant to log the corrected time.`,
    });
    success(res, week);
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
