import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, paginated, error } from '../utils/response';
import { hashPassword } from '../utils/password';
import { logActivity } from '../utils/activityLogger';
import { sendEmail } from '../config/nodemailer';
import { getPaginationParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;
const qs = (v: unknown): string | undefined => (v && typeof v === 'string' ? v : undefined);

export const getUsers: RequestHandler = async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = getPaginationParams(req.query as Record<string, unknown>);
    const search = qs(req.query.search);
    const role = qs(req.query.role);
    const isActive = qs(req.query.isActive);
    const where: Record<string, unknown> = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, email: true, phone: true, department: true, designation: true, employeeId: true, jobRoles: true, managerEmployeeIds: true, role: true, isActive: true, createdAt: true, updatedAt: true, _count: { select: { ownedProjects: true } } } }),
      prisma.user.count({ where }),
    ]);
    paginated(res, items.map(({ _count, ...u }) => ({ ...u, projectCount: _count.ownedProjects })), total, page, pageSize);
  } catch (err) { next(err); }
};

export const getUser: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true, department: true, designation: true, employeeId: true, jobRoles: true, managerEmployeeIds: true, role: true, isActive: true, createdAt: true, updatedAt: true } });
    if (!user) return next(new AppError('User not found', 404));
    const [recentActivity, ownedProjects] = await Promise.all([
      prisma.activityLog.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.project.findMany({ where: { ownerId: id }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, clientName: true, status: true, priority: true, createdAt: true } }),
    ]);
    success(res, { ...user, recentActivity, ownedProjects });
  } catch (err) { next(err); }
};

export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return next(new AppError('User not found', 404));
    const { name, phone, department, designation, employeeId, jobRoles, managerEmployeeIds, role, isActive } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (department !== undefined) data.department = department;
    if (designation !== undefined) data.designation = designation;
    if (employeeId !== undefined) {
      const existingEmployeeId = await prisma.user.findFirst({ where: { employeeId } });
      if (existingEmployeeId && existingEmployeeId.id !== id) { error(res, 'Employee ID already in use', 409); return; }
      data.employeeId = employeeId;
    }
    if (jobRoles !== undefined) data.jobRoles = jobRoles;
    if (managerEmployeeIds !== undefined) data.managerEmployeeIds = managerEmployeeIds;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    const user = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true, isActive: true, updatedAt: true } });
    await logActivity({ userId: req.user!.id, action: 'UPDATE', module: 'USER', description: `Updated user ${id}` });
    success(res, user);
  } catch (err) { next(err); }
};

export const deactivateUser: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return next(new AppError('User not found', 404));
    const user = await prisma.user.update({ where: { id }, data: { isActive: false }, select: { id: true, name: true, email: true, isActive: true } });
    await logActivity({ userId: req.user!.id, action: 'DEACTIVATE', module: 'USER', description: `Deactivated user ${id}` });
    success(res, user);
  } catch (err) { next(err); }
};

export const deleteUser: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    if (id === req.user!.id) { error(res, 'You cannot delete your own account', 400); return; }
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!user) return next(new AppError('User not found', 404));
    const owned = await prisma.project.count({ where: { ownerId: id } });
    if (owned > 0) { error(res, `This user owns ${owned} project(s). Reassign or delete those projects first.`, 400); return; }
    await prisma.user.delete({ where: { id } });
    await logActivity({ userId: req.user!.id, action: 'DELETE', module: 'USER', description: `Deleted user "${user.name}"` });
    success(res, null, 'User deleted');
  } catch (err) { next(err); }
};

export const resetUserPassword: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const { newPassword } = req.body; // complexity enforced by adminResetPasswordSchema on the route
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return next(new AppError('User not found', 404));
    await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(newPassword) } });
    // Never put the password itself in the email — it would sit in the user's
    // inbox and the mail provider's logs in plaintext. The admin shares it out-of-band.
    await sendEmail(existing.email, 'Your password has been reset', `<p>Hi ${existing.name}, an administrator has reset your account password. Please get your new password from your administrator and change it after your first login.</p>`);
    await logActivity({ userId: req.user!.id, action: 'RESET_PASSWORD', module: 'USER', description: `Reset password for user ${id}` });
    success(res, null, 'Password reset and email sent');
  } catch (err) { next(err); }
};

export const getManagers: RequestHandler = async (req, res, next) => {
  try {
    const managers = await prisma.user.findMany({
      where: {
        OR: [
          { jobRoles: { has: 'Manager' } },
          { role: 'ADMIN' },
        ],
        isActive: true,
      },
      select: { id: true, name: true, email: true, employeeId: true, jobRoles: true },
    });
    success(res, managers);
  } catch (err) { next(err); }
};

export const getMyTeam: RequestHandler = async (req, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!currentUser?.employeeId) {
      success(res, []);
      return;
    }
    const team = await prisma.user.findMany({
      where: { managerEmployeeIds: { has: currentUser.employeeId }, isActive: true },
      select: { id: true, name: true, email: true, phone: true, department: true, designation: true, employeeId: true, jobRoles: true, managerEmployeeIds: true },
    });
    success(res, team);
  } catch (err) { next(err); }
};

export const assignReportee: RequestHandler = async (req, res, next) => {
  try {
    const { employeeId } = req.body; // The employeeId of the reportee to assign
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
    
    if (!currentUser?.employeeId) {
      error(res, 'You need an Employee ID to assign reportees', 400); return;
    }
    if (!currentUser.jobRoles.includes('Manager') && currentUser.role !== 'ADMIN') {
      error(res, 'Only managers can assign reportees', 403); return;
    }

    const reportee = await prisma.user.findFirst({ where: { employeeId } });
    if (!reportee) {
      error(res, 'Employee not found', 404); return;
    }

    if (!reportee.managerEmployeeIds.includes(currentUser.employeeId)) {
      await prisma.user.update({
        where: { id: reportee.id },
        data: { managerEmployeeIds: { push: currentUser.employeeId } }
      });
      await logActivity({ userId: req.user!.id, action: 'UPDATE', module: 'USER', description: `Assigned employee ${employeeId} to their team` });
    }
    
    success(res, null, 'Employee assigned to your team successfully');
  } catch (err) { next(err); }
};

export const getMyManagers: RequestHandler = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { managerEmployeeIds: true }
    });

    if (!user || user.managerEmployeeIds.length === 0) {
      success(res, []);
      return;
    }

    const managers = await prisma.user.findMany({
      where: { employeeId: { in: user.managerEmployeeIds }, isActive: true },
      select: { id: true, name: true, employeeId: true }
    });

    success(res, managers);
  } catch (err) {
    next(err);
  }
};
