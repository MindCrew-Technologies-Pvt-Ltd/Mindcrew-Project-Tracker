import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, paginated, error } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { createNotification } from '../utils/notifications';
import { getPaginationParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;
const qs = (v: unknown): string | undefined => (v && typeof v === 'string' ? v : undefined);

/** The request's project owner, or an admin, may review (approve/reject) it. */
async function assertCanReview(editRequestId: string, user: { id: string; role?: string }) {
  const existing = await prisma.editRequest.findUnique({ where: { id: editRequestId }, include: { project: { select: { ownerId: true, name: true } } } });
  if (!existing) throw new AppError('Edit request not found', 404);
  if (user.role !== 'ADMIN' && existing.project.ownerId !== user.id) {
    throw new AppError('Only the project owner or an admin can review this request', 403);
  }
  return existing;
}

export const getEditRequests: RequestHandler = async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = getPaginationParams(req.query as Record<string, unknown>);
    const status = qs(req.query.status);
    const projectId = qs(req.query.projectId);
    // Non-admins must scope the list to one project (the project detail tab);
    // only admins may list every request across the system. On a project the
    // user doesn't own, they only see their OWN requests — how many others
    // asked, and why, is the owner's business.
    const where: Record<string, unknown> = {};
    if (req.user?.role !== 'ADMIN') {
      if (!projectId) return next(new AppError('projectId is required', 400));
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
      if (!project) return next(new AppError('Project not found', 404));
      if (project.ownerId !== req.user!.id) where.requestedById = req.user!.id;
    }
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
    const existing = await assertCanReview(id, req.user!);
    if (existing.status !== 'PENDING') { error(res, 'Only pending requests can be approved', 400); return; }
    // Approved access does not expire (user decision 2026-07-15).
    const updated = await prisma.editRequest.update({ where: { id }, data: { status: 'APPROVED', reviewedById: req.user!.id, expiresAt: null } });
    await createNotification({ userId: existing.requestedById, title: 'Edit Request Approved', message: `Your edit request for "${existing.project.name}" was approved. You can now edit the project.`, type: 'EDIT_REQUEST_UPDATE', relatedId: id });
    await logActivity({ userId: req.user!.id, action: 'APPROVE', module: 'EDIT_REQUEST', description: `Approved edit request ${id}` });
    success(res, updated);
  } catch (err) { next(err); }
};

export const rejectEditRequest: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await assertCanReview(id, req.user!);
    if (existing.status !== 'PENDING') { error(res, 'Only pending requests can be rejected', 400); return; }
    const reason = qs(req.body.reason);
    const updated = await prisma.editRequest.update({ where: { id }, data: { status: 'REJECTED', reviewedById: req.user!.id, reviewerNotes: reason ?? null } });
    await createNotification({ userId: existing.requestedById, title: 'Edit Request Rejected', message: `Your edit request for "${existing.project.name}" was rejected.${reason ? ` Reason: ${reason}` : ''}`, type: 'EDIT_REQUEST_UPDATE', relatedId: id });
    await logActivity({ userId: req.user!.id, action: 'REJECT', module: 'EDIT_REQUEST', description: `Rejected edit request ${id}` });
    success(res, updated);
  } catch (err) { next(err); }
};
