import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { isoWeekOf, todayInOrgTz } from '../utils/isoWeek';
import {
  assertWeekUnlocked, assertDateEditable, assertDayCapacity, orgTimezone,
} from '../utils/timesheetAccess';

type AuthUser = { id: string; email: string; role?: string };

/** All projects, the user's own (owned or member) first — for agent pickers. */
export async function listProjectsForUser(user: AuthUser) {
  const [mine, all] = await Promise.all([
    prisma.project.findMany({
      where: { OR: [{ ownerId: user.id }, { teamMembers: { some: { userId: user.id } } }] },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 300 }),
  ]);
  const mineIds = new Set(mine.map((p) => p.id));
  return [...mine.map((p) => ({ ...p, mine: true })), ...all.filter((p) => !mineIds.has(p.id)).map((p) => ({ ...p, mine: false }))];
}

/** Resolve a project by id, exact name, then case-insensitive contains. */
export async function resolveProject(ref: string) {
  const byId = await prisma.project.findUnique({ where: { id: ref }, select: { id: true, name: true } }).catch(() => null);
  if (byId) return byId;
  const exact = await prisma.project.findFirst({
    where: { name: { equals: ref, mode: 'insensitive' } }, select: { id: true, name: true },
  });
  if (exact) return exact;
  const matches = await prisma.project.findMany({
    where: { name: { contains: ref, mode: 'insensitive' } }, select: { id: true, name: true }, take: 5,
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new AppError(`Project "${ref}" is ambiguous — did you mean: ${matches.map((m) => m.name).join(', ')}?`, 404);
  }
  const sample = await prisma.project.findMany({ select: { name: true }, take: 8, orderBy: { updatedAt: 'desc' } });
  throw new AppError(`No project matches "${ref}". Recent projects: ${sample.map((s) => s.name).join(', ')}`, 404);
}

/** Create a same-day AI work-log entry. Shared by REST and the MCP tool. */
export async function logWorkForUser(
  user: AuthUser,
  input: { project: string; hours: number; minutes: number; summary: string; billable?: boolean; started?: string },
) {
  const totalMinutes = input.hours * 60 + input.minutes;
  if (totalMinutes < 1) throw new AppError('Entry must be at least 1 minute', 400);
  if (totalMinutes > 24 * 60) throw new AppError('Entry cannot exceed 24 hours', 400);
  const project = await resolveProject(input.project);
  const today = todayInOrgTz(await orgTimezone());
  const { isoYear, isoWeek } = isoWeekOf(today);
  await assertDateEditable(today, user); // trivially true, but keeps one rule-source
  await assertWeekUnlocked(user.id, isoYear, isoWeek);
  await assertDayCapacity(user.id, today, totalMinutes, undefined, undefined, input.started ?? null);
  const entry = await prisma.timeEntry.create({
    data: {
      userId: user.id, projectId: project.id, date: today, minutes: totalMinutes,
      description: input.summary, billable: input.billable ?? true,
      isoYear, isoWeek, source: 'AI_AGENT', workStartedHm: input.started ?? null,
    },
    include: { project: { select: { id: true, name: true } } },
  });
  const dayAgg = await prisma.timeEntry.aggregate({ where: { userId: user.id, date: today }, _sum: { minutes: true } });
  return { entry, todayTotalMinutes: dayAgg._sum.minutes ?? entry.minutes };
}

/** Current-week entries + totals for the token's user. */
export async function myWeekForUser(user: AuthUser) {
  const today = todayInOrgTz(await orgTimezone());
  const { isoYear, isoWeek } = isoWeekOf(today);
  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id, isoYear, isoWeek },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    include: { project: { select: { id: true, name: true } } },
  });
  const envelope = await prisma.timesheetWeek.findUnique({
    where: { userId_isoYear_isoWeek: { userId: user.id, isoYear, isoWeek } },
    select: { status: true },
  });
  return {
    isoYear, isoWeek, today,
    status: envelope?.status ?? 'DRAFT',
    totalMinutes: entries.reduce((s, e) => s + e.minutes, 0),
    entries: entries.map((e) => ({
      id: e.id, project: e.project.name, date: e.date.toISOString().slice(0, 10),
      minutes: e.minutes, billable: e.billable, description: e.description, source: e.source,
    })),
  };
}

// ---- REST handlers (thin wrappers) ----

export const getProjects: RequestHandler = async (req, res, next) => {
  try { success(res, await listProjectsForUser(req.user!)); } catch (err) { next(err); }
};

export const postWorkLog: RequestHandler = async (req, res, next) => {
  try {
    const { project, hours, minutes, summary, billable, started } = req.body;
    const result = await logWorkForUser(req.user!, { project, hours, minutes, summary, billable, started });
    success(res, result, 'Work logged', 201);
  } catch (err) { next(err); }
};

export const getMyWeek: RequestHandler = async (req, res, next) => {
  try { success(res, await myWeekForUser(req.user!)); } catch (err) { next(err); }
};
