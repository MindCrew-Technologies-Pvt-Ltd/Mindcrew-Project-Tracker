import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { paginated } from '../utils/response';
import { getPaginationParams } from '../utils/pagination';

const qs = (v: unknown): string | undefined => (v && typeof v === 'string' ? v : undefined);

export const getActivityLogs: RequestHandler = async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = getPaginationParams(req.query as Record<string, unknown>);
    const userId = qs(req.query.userId);
    const module = qs(req.query.module);
    const action = qs(req.query.action);
    const startDate = qs(req.query.startDate);
    const endDate = qs(req.query.endDate);
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (module) where.module = module;
    if (action) where.action = action;
    if (startDate || endDate) where.createdAt = { ...(startDate && { gte: new Date(startDate) }), ...(endDate && { lte: new Date(endDate) }) };
    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true, role: true } } } }),
      prisma.activityLog.count({ where }),
    ]);
    paginated(res, items, total, page, pageSize);
  } catch (err) { next(err); }
};
