import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { LeaveType, LeaveStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { sendWebPushNotification, sendWebPushToMany } from '../services/webPush.service';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;

export const createLeaveRequest: RequestHandler = async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    
    // Week-based date restriction: users cannot request leaves for completed weeks
    const reqStart = new Date(startDate);
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekMonday = new Date(now);
    currentWeekMonday.setDate(now.getDate() - mondayOffset);
    currentWeekMonday.setHours(0, 0, 0, 0);
    
    if (reqStart < currentWeekMonday) {
      error(res, 'Cannot request leaves for dates in completed weeks. Earliest allowed date is ' + currentWeekMonday.toISOString().split('T')[0], 400);
      return;
    }

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

    // Notify all reporting managers about the new request
    const employee = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, employeeId: true, managerEmployeeIds: true },
    });

    if (employee && employee.managerEmployeeIds.length > 0) {
      const managers = await (prisma.user.findMany as any)({
        where: { employeeId: { in: employee.managerEmployeeIds }, pushSubscription: { not: null } },
        select: { pushSubscription: true },
      }) as Array<{ pushSubscription: string }>;
      const subs = managers.map((m) => m.pushSubscription).filter(Boolean);
      const typeLabel = type === 'FULL_DAY' ? 'Full Day Leave' : type === 'HALF_DAY' ? 'Half Day Leave' : 'WFH';
      await sendWebPushToMany(subs, {
        title: '📋 New Leave Request',
        body: `${employee.name} has requested ${typeLabel}. Please review it.`,
        tag: `leave-request-${leave.id}`,
        url: '/leaves',
      });
    }
    
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

    // Notify the employee that their request was reviewed
    const employee = await (prisma.user.findUnique as any)({
      where: { id: leave.userId },
      select: { name: true, pushSubscription: true },
    }) as { name: string; pushSubscription: string | null } | null;
    if (employee?.pushSubscription) {
      const emoji = status === 'APPROVED' ? '✅' : '❌';
      const typeLabel = leave.type === 'FULL_DAY' ? 'Leave' : leave.type === 'HALF_DAY' ? 'Half Day Leave' : 'WFH';
      await sendWebPushNotification(employee.pushSubscription, {
        title: `${emoji} ${typeLabel} ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        body: `Your ${typeLabel} request from ${new Date(leave.startDate).toLocaleDateString('en-IN')} has been ${status.toLowerCase()}.`,
        tag: `leave-status-${leave.id}`,
        url: '/leaves',
      });
    }

    success(res, updatedLeave, `Leave request ${status.toLowerCase()} successfully`);
  } catch (err) { next(err); }
};
