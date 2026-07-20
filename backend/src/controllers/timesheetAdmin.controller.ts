import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { toUtcDateOnly } from '../utils/isoWeek';

const sp = (v: string | string[]): string => (Array.isArray(v) ? v[0]! : v);

export const getSettings: RequestHandler = async (_req, res, next) => {
  try {
    const settings = await prisma.timesheetSettings.upsert({
      where: { id: 'singleton' }, update: {}, create: { id: 'singleton' },
    });
    success(res, settings);
  } catch (err) { next(err); }
};

export const updateSettings: RequestHandler = async (req, res, next) => {
  try {
    const { weeklyTargetHours, reminderEnabled, reminderDay, reminderHour } = req.body;
    const settings = await prisma.timesheetSettings.upsert({
      where: { id: 'singleton' },
      update: {
        ...(weeklyTargetHours !== undefined && { weeklyTargetHours }),
        ...(reminderEnabled !== undefined && { reminderEnabled }),
        ...(reminderDay !== undefined && { reminderDay }),
        ...(reminderHour !== undefined && { reminderHour }),
      },
      create: {
        id: 'singleton',
        ...(weeklyTargetHours !== undefined && { weeklyTargetHours }),
        ...(reminderEnabled !== undefined && { reminderEnabled }),
        ...(reminderDay !== undefined && { reminderDay }),
        ...(reminderHour !== undefined && { reminderHour }),
      },
    });
    success(res, settings);
  } catch (err) { next(err); }
};

export const listHolidays: RequestHandler = async (_req, res, next) => {
  try {
    success(res, await prisma.holiday.findMany({ orderBy: { date: 'asc' } }));
  } catch (err) { next(err); }
};

export const addHoliday: RequestHandler = async (req, res, next) => {
  try {
    const { date, name } = req.body;
    const day = toUtcDateOnly(date);
    const existing = await prisma.holiday.findUnique({ where: { date: day } });
    if (existing) { error(res, 'A holiday already exists on that date', 409); return; }
    success(res, await prisma.holiday.create({ data: { date: day, name } }), 'Holiday added', 201);
  } catch (err) { next(err); }
};

export const deleteHoliday: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Holiday not found', 404));
    await prisma.holiday.delete({ where: { id } });
    success(res, null, 'Holiday removed');
  } catch (err) { next(err); }
};

export const listRates: RequestHandler = async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, billableRate: true },
      orderBy: { name: 'asc' },
    });
    success(res, users);
  } catch (err) { next(err); }
};

export const setRate: RequestHandler = async (req, res, next) => {
  try {
    const userId = sp(req.params.userId);
    const { hourlyRate, currency } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return next(new AppError('User not found', 404));
    const rate = await prisma.billableRate.upsert({
      where: { userId },
      update: { hourlyRate, ...(currency ? { currency } : {}) },
      create: { userId, hourlyRate, ...(currency ? { currency } : {}) },
    });
    success(res, rate);
  } catch (err) { next(err); }
};
