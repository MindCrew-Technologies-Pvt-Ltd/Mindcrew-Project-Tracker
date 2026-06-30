import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, paginated, error } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { createNotification } from '../utils/notifications';
import { getPaginationParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;
const qs = (v: unknown): string | undefined => (v && typeof v === 'string' ? v : undefined);

function parseDuration(duration: string): Date {
  const now = new Date();
  const map: Record<string, number> = { '1 day': 1, '3 days': 3, '1 week': 7, '2 weeks': 14 };
  const days = map[duration.toLowerCase().trim()] ?? 1;
  now.setDate(now.getDate() + days);
  return now;
}

export const getEditRequests: RequestHandler = async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = getPaginationParams(req.query as Record<string, unknown>);
    const status = qs(req.query.status);
    const projectId = qs(req.query.projectId);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    const [items, total] = await Promise.all([
      prisma.editRequest.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { requestedBy: { select: { id: true, name: true, email: true } }, project: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true, email: true } } } }),
      prisma.editRequest.count({ where }),
    ]);
    paginated(res, items, total, page, pageSize);
  } catch (err) { next(err); }
};

export const getEditRequest: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const req_ = await prisma.editRequest.findUnique({ where: { id }, include: { requestedBy: { select: { id: true, name: true, email: true } }, project: { select: { id: true, name: true, status: true } }, reviewedBy: { select: { id: true, name: true, email: true } } } });
    if (!req_) return next(new AppError('Edit request not found', 404));
    success(res, req_);
  } catch (err) { next(err); }
};

export const approveEditRequest: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.editRequest.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Edit request not found', 404));
    if (existing.status !== 'PENDING') { error(res, 'Only pending requests can be approved', 400); return; }
    const expiresAt = parseDuration(req.body.duration || existing.duration);
    const updated = await prisma.editRequest.update({ where: { id }, data: { status: 'APPROVED', reviewedById: req.user!.id, expiresAt } });
    await createNotification({ userId: existing.requestedById, title: 'Edit Request Approved', message: `Your edit request was approved. Access expires ${expiresAt.toLocaleDateString()}.`, type: 'EDIT_REQUEST_UPDATE', relatedId: id });
    await logActivity({ userId: req.user!.id, action: 'APPROVE', module: 'EDIT_REQUEST', description: `Approved edit request ${id}` });
    success(res, updated);
  } catch (err) { next(err); }
};

export const rejectEditRequest: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.editRequest.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Edit request not found', 404));
    if (existing.status !== 'PENDING') { error(res, 'Only pending requests can be rejected', 400); return; }
    const { reason } = req.body;
    const updated = await prisma.editRequest.update({ where: { id }, data: { status: 'REJECTED', reviewedById: req.user!.id, reviewerNotes: reason } });
    await createNotification({ userId: existing.requestedById, title: 'Edit Request Rejected', message: `Your edit request was rejected. Reason: ${reason}`, type: 'EDIT_REQUEST_UPDATE', relatedId: id });
    await logActivity({ userId: req.user!.id, action: 'REJECT', module: 'EDIT_REQUEST', description: `Rejected edit request ${id}` });
    success(res, updated);
  } catch (err) { next(err); }
};
