import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { LeaveType, LeaveStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../utils/notifications';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;

export const createLeaveRequest: RequestHandler = async (req, res, next) => {
  try {
    const { type, startDate, endDate, reason, notifyManagerIds } = req.body;
    
    if (!notifyManagerIds || notifyManagerIds.length === 0) {
      error(res, 'Manager selection is required', 400);
      return;
    }
    
    // Week-based date restriction: users cannot request leaves for completed weeks
    const reqStart = new Date(startDate);
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekMonday = new Date(now);
    currentWeekMonday.setDate(now.getDate() - mondayOffset);
    currentWeekMonday.setHours(0, 0, 0, 0);
    
    const settings = await prisma.timesheetSettings.findUnique({ where: { id: 'singleton' } });
    const disableLeaveLock = settings?.disableLeaveLock ?? false;
    
    if (!disableLeaveLock && reqStart < currentWeekMonday) {
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
        status: 'PENDING',
        notifiedManagerIds: Array.isArray(notifyManagerIds) ? notifyManagerIds : []
      }
    });

    // Notify selected managers and all admins about the new request
    const employee = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, employeeId: true, managerEmployeeIds: true },
    });

    const typeLabel = type === 'FULL_DAY' ? 'Full Day Leave' : type === 'HALF_DAY' ? 'Half Day Leave' : type === 'SHORT_LEAVE' ? 'Short Leave' : type === 'COMP_OFF' ? 'Comp-Off' : 'WFH';

    if (employee) {
      // 1. Notify selected managers
      const managersToNotify = Array.isArray(notifyManagerIds) && notifyManagerIds.length > 0 
        ? notifyManagerIds 
        : employee.managerEmployeeIds;

      const managers = await prisma.user.findMany({
        where: { employeeId: { in: managersToNotify } },
        select: { id: true },
      });
      
      for (const mgr of managers) {
        await createNotification({
          userId: mgr.id,
          title: '📋 New Leave Request',
          message: `${employee.name} has requested ${typeLabel}. Please review it.`,
          type: 'LEAVE_REQUEST',
          relatedId: leave.id,
        });
      }

      // 2. Notify all admin users (who aren't already notified as managers)
      const managerUserIds = new Set(managers.map(m => m.id));
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', id: { notIn: Array.from(managerUserIds) }, isActive: true },
        select: { id: true },
      });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: '📋 New Leave Request',
          message: `${employee.name} has requested ${typeLabel}. Please review it.`,
          type: 'LEAVE_REQUEST',
          relatedId: leave.id,
        });
      }
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
    if (!currentUser) { error(res, 'User not found', 404); return; }
    const isAdmin = 
      currentUser.role === 'ADMIN' || 
      currentUser.jobRoles.some(r => r.toUpperCase() === 'ADMIN') ||
      (currentUser.jobRoles.some(r => r.toUpperCase() === 'HR') && currentUser.jobRoles.some(r => r.toUpperCase() === 'MANAGER'));

    if (!isAdmin && !currentUser?.employeeId) {
      success(res, []);
      return;
    }

    const empId = currentUser!.employeeId!;
    const empIdNum = empId.replace('MCT-', '');
    const empIdFull = `MCT-${empIdNum}`;

    // A manager can see a request if:
    // 1. They are an admin OR
    // 2. The request's notifiedManagerIds contains their ID (either format) OR
    // 3. For backwards compatibility, if notifiedManagerIds is empty, we show it to all managers of that user.
    const teamLeaves = await prisma.leaveRequest.findMany({
      where: isAdmin ? {} : {
        OR: [
          { notifiedManagerIds: { has: empId } },
          { notifiedManagerIds: { has: empIdNum } },
          { notifiedManagerIds: { has: empIdFull } },
          {
            notifiedManagerIds: { isEmpty: true },
            user: { managerEmployeeIds: { has: empId } }
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, employeeId: true, department: true, designation: true, managerEmployeeIds: true } },
        reviewedBy: { select: { name: true } }
      }
    });

    const allManagerIds = Array.from(new Set(teamLeaves.flatMap(l => l.user.managerEmployeeIds || [])));
    const managers = await prisma.user.findMany({ where: { employeeId: { in: allManagerIds } }, select: { employeeId: true, name: true } });
    const managerMap = new Map(managers.map(m => [m.employeeId, m.name]));

    const enriched = teamLeaves.map(l => {
      const managerNames = (l.user.managerEmployeeIds || []).map(id => managerMap.get(id)).filter(Boolean).join(', ');
      return { ...l, user: { ...l.user, managerNames } };
    });

    success(res, enriched);
  } catch (err) { next(err); }
};

export const updateLeaveStatus: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const { status } = req.body; // 'APPROVED' | 'REJECTED'

    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!currentUser) { error(res, 'User not found', 404); return; }
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.jobRoles.includes('Admin');

    if (!isAdmin && !currentUser?.employeeId) {
      error(res, 'You need an Employee ID to approve leaves', 400); return;
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leave) return next(new AppError('Leave request not found', 404));

    if (leave.userId === currentUser.id) {
      error(res, 'You cannot approve or reject your own leave request', 403); return;
    }

    // Ensure the current user is an admin or the manager to whom it was notified
    if (!isAdmin) {
      const empId = currentUser!.employeeId!;
      const empIdNum = empId.replace('MCT-', '');
      const empIdFull = `MCT-${empIdNum}`;
      
      const isNotified = leave.notifiedManagerIds.includes(empId) || 
                         leave.notifiedManagerIds.includes(empIdNum) || 
                         leave.notifiedManagerIds.includes(empIdFull);
                         
      const isFallbackManager = leave.notifiedManagerIds.length === 0 && 
                                leave.user.managerEmployeeIds.includes(empId);
                                
      if (!isNotified && !isFallbackManager) {
        error(res, 'You are not authorized to approve this leave request. Only the notified manager can approve it.', 403); return;
      }
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

    // Notify the employee that their request was reviewed (in-app + push)
    const emoji = status === 'APPROVED' ? '✅' : '❌';
    const typeLabel = leave.type === 'FULL_DAY' ? 'Leave' : leave.type === 'HALF_DAY' ? 'Half Day Leave' : leave.type === 'SHORT_LEAVE' ? 'Short Leave' : leave.type === 'COMP_OFF' ? 'Comp-Off' : 'WFH';
    await createNotification({
      userId: leave.userId,
      title: `${emoji} ${typeLabel} ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      message: `Your ${typeLabel} request from ${new Date(leave.startDate).toLocaleDateString('en-IN')} has been ${status.toLowerCase()}.`,
      type: 'LEAVE_STATUS',
      relatedId: leave.id,
    });

    success(res, updatedLeave, `Leave request ${status.toLowerCase()} successfully`);
  } catch (err) { next(err); }
};

export const cancelLeaveRequest: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const leave = await prisma.leaveRequest.findUnique({ where: { id }, include: { user: true } });
    if (!leave) return next(new AppError('Leave request not found', 404));

    if (leave.userId !== req.user!.id) {
      error(res, 'You can only cancel your own leave requests', 403);
      return;
    }

    if (leave.status === 'CANCELLED') {
      error(res, 'Leave is already cancelled', 400); return;
    }
    if (leave.cancelRequested) {
      error(res, 'Cancellation is already requested', 400); return;
    }

    await prisma.leaveRequest.update({ 
      where: { id },
      data: { cancelRequested: true }
    });

    // Notify managers and admins about cancellation request
    const employee = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, employeeId: true, managerEmployeeIds: true },
    });

    if (employee) {
      const managersToNotify = leave.notifiedManagerIds.length > 0 
        ? leave.notifiedManagerIds 
        : employee.managerEmployeeIds;

      const managers = await prisma.user.findMany({
        where: { employeeId: { in: managersToNotify } },
        select: { id: true },
      });
      
      const typeLabel = leave.type === 'FULL_DAY' ? 'Full Day Leave' : leave.type === 'HALF_DAY' ? 'Half Day Leave' : leave.type === 'WFH' ? 'WFH' : leave.type === 'SHORT_LEAVE' ? 'Short Leave' : 'Comp-Off';
      for (const mgr of managers) {
        await createNotification({
          userId: mgr.id,
          title: '⚠️ Leave Cancellation Request',
          message: `${employee.name} has requested to cancel their ${typeLabel}. Please review it.`,
          type: 'LEAVE_CANCEL',
          relatedId: leave.id,
        });
      }

      // Also notify admins
      const managerUserIds = new Set(managers.map(m => m.id));
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', id: { notIn: Array.from(managerUserIds) }, isActive: true },
        select: { id: true },
      });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: '⚠️ Leave Cancellation Request',
          message: `${employee.name} has requested to cancel their ${typeLabel}. Please review it.`,
          type: 'LEAVE_CANCEL',
          relatedId: leave.id,
        });
      }
    }

    success(res, null, 'Cancellation request sent successfully');
  } catch (err) { next(err); }
};

export const reviewCancellation: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const { approved } = req.body;

    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!currentUser) { error(res, 'User not found', 404); return; }
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.jobRoles.includes('Admin');

    if (!isAdmin && !currentUser?.employeeId) {
      error(res, 'You need an Employee ID to approve cancellations', 400); return;
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leave) return next(new AppError('Leave request not found', 404));

    if (!leave.cancelRequested) {
      error(res, 'No cancellation requested for this leave', 400); return;
    }

    // Authorization
    if (!isAdmin) {
      const empId = currentUser!.employeeId!;
      const empIdNum = empId.replace('MCT-', '');
      const empIdFull = `MCT-${empIdNum}`;
      
      const isNotified = leave.notifiedManagerIds.includes(empId) || 
                         leave.notifiedManagerIds.includes(empIdNum) || 
                         leave.notifiedManagerIds.includes(empIdFull);
                         
      const isFallbackManager = leave.notifiedManagerIds.length === 0 && 
                                leave.user.managerEmployeeIds.includes(empId);
                                
      if (!isNotified && !isFallbackManager) {
        error(res, 'You are not authorized to review this cancellation.', 403); return;
      }
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: approved ? 'CANCELLED' : leave.status,
        cancelRequested: false,
        reviewedById: currentUser.id,
        reviewedAt: new Date()
      }
    });

    // Notify employee (in-app + push)
    const typeLabel = leave.type === 'FULL_DAY' ? 'Leave' : leave.type === 'HALF_DAY' ? 'Half Day Leave' : leave.type === 'WFH' ? 'WFH' : leave.type === 'SHORT_LEAVE' ? 'Short Leave' : 'Comp-Off';
    const actionStr = approved ? 'approved' : 'rejected';
    await createNotification({
      userId: leave.userId,
      title: `🚫 Cancellation ${approved ? 'Approved' : 'Rejected'}`,
      message: `Your request to cancel ${typeLabel} from ${new Date(leave.startDate).toLocaleDateString('en-IN')} has been ${actionStr}.`,
      type: 'LEAVE_CANCEL_STATUS',
      relatedId: leave.id,
    });

    success(res, updatedLeave, `Cancellation ${approved ? 'approved' : 'rejected'} successfully`);
  } catch (err) { next(err); }
};
