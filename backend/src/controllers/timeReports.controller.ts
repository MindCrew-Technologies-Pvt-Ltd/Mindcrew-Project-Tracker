import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { toUtcDateOnly } from '../utils/isoWeek';
import { ownedProjectIds } from '../utils/timesheetAccess';

const qs = (v: unknown): string | undefined => (v && typeof v === 'string' ? v : undefined);
const MAX_RANGE_DAYS = 370;

type Scope = { projectIds?: string[]; selfOnly?: boolean };

/** Owners see their projects' time; admins see all; everyone always sees their own. */
async function reportScope(user: { id: string; role?: string }): Promise<Scope> {
  if (user.role === 'ADMIN') return {};
  const owned = await ownedProjectIds(user.id);
  if (owned.length > 0) return { projectIds: owned };
  return { selfOnly: true };
}

function parseRange(fromRaw?: string, toRaw?: string): { from: Date; to: Date } {
  if (!fromRaw || !toRaw) throw new AppError('from and to are required (YYYY-MM-DD)', 400);
  const from = toUtcDateOnly(fromRaw);
  const to = toUtcDateOnly(toRaw);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new AppError('Invalid date range', 400);
  if (from > to) throw new AppError('from must be before to', 400);
  if ((to.getTime() - from.getTime()) / 86400000 > MAX_RANGE_DAYS) throw new AppError('Range too large (max 1 year)', 400);
  return { from, to };
}

async function summaryRows(user: { id: string; role?: string }, query: Record<string, unknown>) {
  const { from, to } = parseRange(qs(query.from), qs(query.to));
  const groupBy = (qs(query.groupBy) ?? 'project') as 'user' | 'project' | 'day';
  if (!['user', 'project', 'day'].includes(groupBy)) throw new AppError('groupBy must be user, project or day', 400);
  const scope = await reportScope(user);
  const projectId = qs(query.projectId);
  const userId = qs(query.userId);
  const billable = qs(query.billable);

  const where = {
    date: { gte: from, lte: to },
    ...(scope.selfOnly ? { userId: user.id } : {}),
    ...(scope.projectIds ? { projectId: { in: scope.projectIds } } : {}),
    ...(projectId ? { projectId } : {}),
    ...(userId && !scope.selfOnly ? { userId } : {}),
    ...(billable === 'true' ? { billable: true } : billable === 'false' ? { billable: false } : {}),
  };

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });

  const keyOf = (e: (typeof entries)[number]) =>
    groupBy === 'user' ? e.user.id : groupBy === 'project' ? e.project.id : e.date.toISOString().slice(0, 10);
  const labelOf = (e: (typeof entries)[number]) =>
    groupBy === 'user' ? e.user.name : groupBy === 'project' ? e.project.name : e.date.toISOString().slice(0, 10);

  const buckets = new Map<string, { key: string; label: string; minutes: number; billableMinutes: number; entryCount: number }>();
  for (const e of entries) {
    const k = keyOf(e);
    const b = buckets.get(k) ?? { key: k, label: labelOf(e), minutes: 0, billableMinutes: 0, entryCount: 0 };
    b.minutes += e.minutes;
    if (e.billable) b.billableMinutes += e.minutes;
    b.entryCount += 1;
    buckets.set(k, b);
  }
  const rows = [...buckets.values()].sort((a, b) => (groupBy === 'day' ? a.key.localeCompare(b.key) : b.minutes - a.minutes));
  const totals = {
    minutes: rows.reduce((s, r) => s + r.minutes, 0),
    billableMinutes: rows.reduce((s, r) => s + r.billableMinutes, 0),
    entryCount: rows.reduce((s, r) => s + r.entryCount, 0),
  };
  return { rows, totals, groupBy, from, to };
}

export const timeSummary: RequestHandler = async (req, res, next) => {
  try {
    success(res, await summaryRows(req.user!, req.query as Record<string, unknown>));
  } catch (err) { next(err); }
};

/** Per-user logged vs target (settings.weeklyTargetHours pro-rated to the range's weeks). */
export const utilization: RequestHandler = async (req, res, next) => {
  try {
    const { from, to } = parseRange(qs(req.query.from), qs(req.query.to));
    const scope = await reportScope(req.user!);
    const settings = await prisma.timesheetSettings.findUnique({ where: { id: 'singleton' } });
    const targetPerWeek = (settings?.weeklyTargetHours ?? 40) * 60;
    const weeks = Math.max(1, Math.round((to.getTime() - from.getTime()) / (7 * 86400000)));
    const target = targetPerWeek * weeks;

    const where = {
      date: { gte: from, lte: to },
      ...(scope.selfOnly ? { userId: req.user!.id } : {}),
      ...(scope.projectIds ? { projectId: { in: scope.projectIds } } : {}),
    };
    const grouped = await prisma.timeEntry.groupBy({
      by: ['userId'], where, _sum: { minutes: true },
    });
    const billableGrouped = await prisma.timeEntry.groupBy({
      by: ['userId'], where: { ...where, billable: true }, _sum: { minutes: true },
    });
    const billableMap = new Map(billableGrouped.map((g) => [g.userId, g._sum.minutes ?? 0]));
    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, name: true, email: true, billableRate: { select: { hourlyRate: true, currency: true } } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const rows = grouped.map((g) => {
      const u = userMap.get(g.userId);
      const minutes = g._sum.minutes ?? 0;
      const rate = req.user!.role === 'ADMIN' ? u?.billableRate?.hourlyRate ?? null : null;
      return {
        userId: g.userId,
        name: u?.name ?? 'Unknown',
        email: u?.email ?? '',
        minutes,
        billableMinutes: billableMap.get(g.userId) ?? 0,
        targetMinutes: target,
        utilizationPct: Math.round((minutes / target) * 100),
        overtimeMinutes: Math.max(0, minutes - target),
        ...(rate !== null ? { cost: Math.round((minutes / 60) * rate * 100) / 100, currency: u?.billableRate?.currency } : {}),
      };
    }).sort((a, b) => b.minutes - a.minutes);
    success(res, { rows, targetMinutes: target, weeks, from, to });
  } catch (err) { next(err); }
};

/** CSV export of the summary (uses the same scoping). */
export const exportSummary: RequestHandler = async (req, res, next) => {
  try {
    const { rows, totals, groupBy, from, to } = await summaryRows(req.user!, req.query as Record<string, unknown>);
    const esc = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@]/.test(s)) s = `'${s}`; // formula-injection guard
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const h = (m: number) => (m / 60).toFixed(2);
    const lines = [
      [groupBy === 'user' ? 'Person' : groupBy === 'project' ? 'Project' : 'Day', 'Hours', 'Billable hours', 'Entries'].join(','),
      ...rows.map((r) => [esc(r.label), h(r.minutes), h(r.billableMinutes), r.entryCount].join(',')),
      ['TOTAL', h(totals.minutes), h(totals.billableMinutes), totals.entryCount].join(','),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="time-report-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) { next(err); }
};
