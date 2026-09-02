import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';

const VALID_STATUSES = ['FULLY_AVAILABLE', 'PARTIALLY_AVAILABLE', 'IN_TRAINING', 'ON_LEAVE', 'BUSY'] as const;
type AvailabilityStatus = typeof VALID_STATUSES[number];

const db = prisma as any; // Prisma types not yet regenerated for new models — safe cast

// Helper: Get start of a day in UTC
function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * POST /api/availability
 * Employee posts (or updates) their daily availability update.
 * Only one entry per user per day is allowed (upsert).
 */
export const upsertMyAvailability: RequestHandler = async (req, res, next) => {
  try {
    const { status, note, date } = req.body;
    const dayDate = date ? startOfDay(date) : startOfDay(new Date().toISOString());

    if (!VALID_STATUSES.includes(status as AvailabilityStatus)) {
      error(res, `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`, 400);
      return;
    }

    const record = await db.dailyAvailability.upsert({
      where: { userId_date: { userId: req.user!.id, date: dayDate } },
      update: { status, note: note ?? null, updatedAt: new Date() },
      create: { userId: req.user!.id, date: dayDate, status, note: note ?? null },
      include: {
        user: { select: { name: true, employeeId: true, department: true, designation: true } },
      },
    });

    success(res, record, 'Availability updated successfully');
  } catch (err) { next(err); }
};

/**
 * GET /api/availability/me
 * Employee sees their own availability history (last 30 days).
 */
export const getMyAvailability: RequestHandler = async (req, res, next) => {
  try {
    const records = await db.dailyAvailability.findMany({
      where: { userId: req.user!.id },
      orderBy: { date: 'desc' },
      take: 30,
    });
    success(res, records);
  } catch (err) { next(err); }
};

/**
 * GET /api/availability/today
 * Employee gets their today's entry (if exists).
 */
export const getTodayMyAvailability: RequestHandler = async (req, res, next) => {
  try {
    const today = startOfDay(new Date().toISOString());
    const record = await db.dailyAvailability.findUnique({
      where: { userId_date: { userId: req.user!.id, date: today } },
    });
    success(res, record ?? null);
  } catch (err) { next(err); }
};

/**
 * GET /api/availability/all
 * Manager / Admin: see all employees' availability updates.
 * Query params:
 *   - date (YYYY-MM-DD): filter by specific date (default: today)
 *   - status: filter by AvailabilityStatus
 */
export const getAllAvailability: RequestHandler = async (req, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const isManagerOrAdmin =
      currentUser?.role === 'ADMIN' || currentUser?.jobRoles?.includes('Manager');

    if (!isManagerOrAdmin) {
      error(res, 'Access denied. Managers and Admins only.', 403);
      return;
    }

    const { date, status } = req.query as { date?: string; status?: string };
    const filterDate = date ? startOfDay(date) : startOfDay(new Date().toISOString());

    const where: any = { date: filterDate };
    if (status && VALID_STATUSES.includes(status as AvailabilityStatus)) {
      where.status = status;
    }

    const records = await db.dailyAvailability.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true, name: true, employeeId: true,
            department: true, designation: true, jobRoles: true,
          },
        },
      },
    });

    success(res, records);
  } catch (err) { next(err); }
};
