import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { LeaveType, LeaveStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;

export const createLeaveRequest: RequestHandler = async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    
    const leave = await prisma.leaveRequest.create({
      data: {
        userId: req.user!.id,
        type: type as LeaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: 'PENDING'
      }
    });
    
    success(res, leave, 'Leave request submitted successfully', 201);
  } catch (err) { next(err); }
};

export const getMyLeaveRequests: RequestHandler = async (req, res, next) => {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewedBy: { select: { name: true, employeeId: true } }
      }
    });
    success(res, leaves);
  } catch (err) { next(err); }
};

export const getTeamLeaveRequests: RequestHandler = async (req, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const isAdmin = currentUser?.role === 'ADMIN';

    if (!isAdmin && !currentUser?.employeeId) {
      success(res, []);
      return;
    }

    const teamLeaves = await prisma.leaveRequest.findMany({
      where: isAdmin ? {} : {
        user: { managerEmployeeIds: { has: currentUser!.employeeId } }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, employeeId: true, department: true, designation: true } },
        reviewedBy: { select: { name: true } }
      }
    });

    success(res, teamLeaves);
  } catch (err) { next(err); }
};

export const updateLeaveStatus: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const { status } = req.body; // 'APPROVED' | 'REJECTED'

    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const isAdmin = currentUser?.role === 'ADMIN';

    if (!isAdmin && !currentUser?.employeeId) {
      error(res, 'You need an Employee ID to approve leaves', 400); return;
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leave) return next(new AppError('Leave request not found', 404));

    // Ensure the current user is an admin or a manager of the requester
    if (!isAdmin && !leave.user.managerEmployeeIds.includes(currentUser!.employeeId!)) {
      error(res, 'You are not authorized to approve this leave request', 403); return;
    }

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      error(res, 'Invalid status', 400); return;
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: status as LeaveStatus,
        reviewedById: currentUser.id,
        reviewedAt: new Date()
      }
    });

    success(res, updatedLeave, `Leave request ${status.toLowerCase()} successfully`);
  } catch (err) { next(err); }
};
