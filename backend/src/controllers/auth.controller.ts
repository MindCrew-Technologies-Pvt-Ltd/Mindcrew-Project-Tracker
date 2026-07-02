import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';
import { success, error } from '../utils/response';
import { sendEmail } from '../config/nodemailer';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, department, designation } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { error(res, 'Email already in use', 409); return; }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, phone, department, designation },
      select: { id: true, name: true, email: true, phone: true, department: true, designation: true, role: true, isActive: true, createdAt: true },
    });
    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
    success(res, { user, ...tokens }, 'Account created', 201);
  } catch (err) { next(err); }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { error(res, 'No account found with this email', 404); return; }
    if (!user.isActive) { error(res, 'This account has been deactivated', 403); return; }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) { error(res, 'Incorrect password', 401); return; }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
    const { passwordHash, passwordResetToken, passwordResetExpiry, ...safeUser } = user;
    success(res, { user: safeUser, ...tokens }, 'Login successful');
  } catch (err) { next(err); }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  success(res, null, 'Logged out');
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, phone: true, department: true, designation: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });
    if (!user) { error(res, 'User not found', 404); return; }
    success(res, user);
  } catch (err) { next(err); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.user.update({ where: { id: user.id }, data: { passwordResetToken: otp, passwordResetExpiry: expiry } });
      await sendEmail(email, 'Your Password Reset OTP',
        `<h2>Password Reset</h2><p>Your OTP: <strong>${otp}</strong></p><p>Valid for 15 minutes.</p>`);
    }
    success(res, null, 'If the email exists, an OTP has been sent');
  } catch (err) { next(err); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;
    const user = await prisma.user.findFirst({ where: { passwordResetToken: token, passwordResetExpiry: { gt: new Date() } } });
    if (!user) { error(res, 'Invalid or expired OTP', 400); return; }
    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null } });
    success(res, null, 'Password reset successfully');
  } catch (err) { next(err); }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { error(res, 'User not found', 404); return; }
    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) { error(res, 'Current password is incorrect', 401); return; }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    success(res, null, 'Password changed');
  } catch (err) { next(err); }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token: string | undefined = req.body?.refreshToken ?? req.cookies?.refreshToken;
    if (!token) { error(res, 'Refresh token required', 400); return; }
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, email: true, role: true, isActive: true } });
    if (!user || !user.isActive) { error(res, 'Invalid token', 401); return; }
    success(res, generateTokens({ id: user.id, email: user.email, role: user.role }), 'Token refreshed');
  } catch (err) { next(err); }
};
