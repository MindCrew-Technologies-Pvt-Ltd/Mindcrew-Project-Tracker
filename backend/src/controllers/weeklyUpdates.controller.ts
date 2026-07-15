import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, paginated } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { createNotification } from '../utils/notifications';
import { getPaginationParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { assertProjectExists, assertProjectWriteAccess } from '../utils/projectAccess';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;

export const getWeeklyUpdates: RequestHandler = async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = getPaginationParams(req.query as Record<string, unknown>);
    const projectId = sp(req.params.projectId);
    await assertProjectExists(projectId);
    const [items, total] = await Promise.all([
      prisma.weeklyUpdate.findMany({ where: { projectId }, skip, take, orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }], include: { author: { select: { id: true, name: true, email: true } } } }),
      prisma.weeklyUpdate.count({ where: { projectId } }),
    ]);
    paginated(res, items, total, page, pageSize);
  } catch (err) { next(err); }
};

export const getWeeklyUpdate: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const update = await prisma.weeklyUpdate.findUnique({ where: { id }, include: { author: { select: { id: true, name: true, email: true } } } });
    if (!update) return next(new AppError('Weekly update not found', 404));
    success(res, update);
  } catch (err) { next(err); }
};

export const createWeeklyUpdate: RequestHandler = async (req, res, next) => {
  try {
    const projectId = sp(req.params.projectId);
    await assertProjectWriteAccess(projectId, req.user!);
    const { weekNumber, year, progressSummary, completedTasks, plannedTasks, blockers, milestones, healthStatus, completionPercentage, hoursLogged } = req.body;
    const update = await prisma.weeklyUpdate.create({
      data: { projectId, authorId: req.user!.id, weekNumber, year, progressSummary, completedTasks: completedTasks ?? [], plannedTasks: plannedTasks ?? [], blockers, milestones, healthStatus, completionPercentage: completionPercentage ?? 0, hoursLogged, attachments: [] },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    await logActivity({ userId: req.user!.id, action: 'CREATE', module: 'WEEKLY_UPDATE', description: `Created weekly update week ${weekNumber}/${year}` });
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true, name: true } });
    if (project && project.ownerId !== req.user!.id) {
      await createNotification({ userId: project.ownerId, title: 'New Weekly Update', message: `Week ${weekNumber}/${year} update posted for ${project.name}`, type: 'PROJECT_UPDATE', projectId, relatedId: update.id });
    }
    success(res, update, 'Update created', 201);
  } catch (err) { next(err); }
};

export const updateWeeklyUpdate: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.weeklyUpdate.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Weekly update not found', 404));
    if (existing.authorId !== req.user!.id && req.user?.role !== 'ADMIN') return next(new AppError('Forbidden', 403));
    const { progressSummary, completedTasks, plannedTasks, blockers, milestones, healthStatus, completionPercentage, hoursLogged } = req.body;
    const updated = await prisma.weeklyUpdate.update({
      where: { id },
      data: { ...(progressSummary !== undefined && { progressSummary }), ...(completedTasks !== undefined && { completedTasks }), ...(plannedTasks !== undefined && { plannedTasks }), ...(blockers !== undefined && { blockers }), ...(milestones !== undefined && { milestones }), ...(healthStatus !== undefined && { healthStatus }), ...(completionPercentage !== undefined && { completionPercentage }), ...(hoursLogged !== undefined && { hoursLogged }) },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    await logActivity({ userId: req.user!.id, action: 'UPDATE', module: 'WEEKLY_UPDATE', description: `Updated weekly update ${id}` });
    success(res, updated);
  } catch (err) { next(err); }
};

export const deleteWeeklyUpdate: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.weeklyUpdate.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Weekly update not found', 404));
    if (existing.authorId !== req.user!.id && req.user?.role !== 'ADMIN') return next(new AppError('Forbidden', 403));
    await prisma.weeklyUpdate.delete({ where: { id } });
    success(res, null, 'Deleted');
  } catch (err) { next(err); }
};
