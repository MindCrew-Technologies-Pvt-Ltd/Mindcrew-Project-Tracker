import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';

export const getFlexibleResources: RequestHandler = async (_req, res, next) => {
  try {
    const resources = await prisma.flexibleResource.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            designation: true,
            department: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    success(res, resources);
  } catch (err) { next(err); }
};

export const addFlexibleResource: RequestHandler = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      error(res, 'User ID is required', 400);
      return;
    }

    const existing = await prisma.flexibleResource.findUnique({ where: { userId } });
    if (existing) {
      error(res, 'User is already a flexible resource', 400);
      return;
    }

    const resource = await prisma.flexibleResource.create({
      data: { userId },
      include: {
        user: {
          select: { id: true, name: true, employeeId: true, designation: true }
        }
      }
    });

    success(res, resource, 'Added to flexible resources successfully', 201);
  } catch (err) { next(err); }
};

export const removeFlexibleResource: RequestHandler = async (req, res, next) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    if (!userId) {
      error(res, 'User ID is required', 400);
      return;
    }

    const existing = await prisma.flexibleResource.findUnique({ where: { userId } });
    if (!existing) {
      error(res, 'User is not in flexible resources', 404);
      return;
    }

    await prisma.flexibleResource.delete({ where: { userId } });
    success(res, null, 'Removed from flexible resources successfully');
  } catch (err) { next(err); }
};
