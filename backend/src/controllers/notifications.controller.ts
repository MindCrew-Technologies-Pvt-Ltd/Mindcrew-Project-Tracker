import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, paginated, error } from '../utils/response';
import { getPaginationParams } from '../utils/pagination';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;

export const getNotifications: RequestHandler = async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = getPaginationParams(req.query as Record<string, unknown>);
    const where: Record<string, unknown> = { userId: req.user!.id };
    const isReadQ = req.query.isRead;
    if (isReadQ !== undefined && typeof isReadQ === 'string') where.isRead = isReadQ === 'true';
    const [items, total] = await Promise.all([
      prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
    ]);
    paginated(res, items, total, page, pageSize);
  } catch (err) { next(err); }
};

export const getUnreadCount: RequestHandler = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user!.id, isRead: false } });
    success(res, { count });
  } catch (err) { next(err); }
};

export const markAsRead: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const n = await prisma.notification.findFirst({ where: { id, userId: req.user!.id } });
    if (!n) { error(res, 'Not found', 404); return; }
    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    success(res, updated);
  } catch (err) { next(err); }
};

export const markAllAsRead: RequestHandler = async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
    success(res, { count: result.count }, 'All marked as read');
  } catch (err) { next(err); }
};

export const updateFcmToken: RequestHandler = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) { error(res, 'fcmToken required', 400); return; }
    await prisma.user.update({ where: { id: req.user!.id }, data: { fcmToken } });
    success(res, null, 'FCM token updated');
  } catch (err) { next(err); }
};
