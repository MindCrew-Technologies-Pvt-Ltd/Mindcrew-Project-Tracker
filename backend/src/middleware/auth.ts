import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import prisma from '../config/prisma';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  jobRoles?: string[];
}

export const authenticate: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { 
      id: decoded.id, 
      email: decoded.email, 
      role: decoded.role as 'ADMIN' | 'EMPLOYEE',
      jobRoles: decoded.jobRoles || [] 
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  let hasAdminRole = req.user?.role === 'ADMIN' || req.user?.jobRoles?.includes('Admin');
  
  if (!hasAdminRole && req.user) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (dbUser) {
        hasAdminRole = dbUser.role === 'ADMIN' || dbUser.jobRoles.includes('Admin');
        // Update req.user so downstream handlers have fresh roles
        req.user.jobRoles = dbUser.jobRoles;
        req.user.role = dbUser.role as 'ADMIN' | 'EMPLOYEE';
      }
    } catch (e) {
      console.error('Error fetching user roles for requireAdmin:', e);
    }
  }

  if (!hasAdminRole) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
};

export const requireAdminOrHR: RequestHandler = async (req, res, next) => {
  let hasAdminRole = req.user?.role === 'ADMIN' || req.user?.jobRoles?.includes('Admin');
  let isHRManager = (req.user?.jobRoles?.some(r => r.toUpperCase() === 'HR') ?? false) && 
                    (req.user?.jobRoles?.some(r => r.toUpperCase() === 'MANAGER') ?? false);
  
  if (!hasAdminRole && !isHRManager && req.user) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (dbUser) {
        hasAdminRole = dbUser.role === 'ADMIN' || dbUser.jobRoles.includes('Admin');
        isHRManager = dbUser.jobRoles.some(r => r.toUpperCase() === 'HR') && 
                      dbUser.jobRoles.some(r => r.toUpperCase() === 'MANAGER');
        // Update req.user so downstream handlers have fresh roles
        req.user.jobRoles = dbUser.jobRoles;
        req.user.role = dbUser.role as 'ADMIN' | 'EMPLOYEE';
      }
    } catch (e) {
      console.error('Error fetching user roles for requireAdminOrHR:', e);
    }
  }

  if (!hasAdminRole && !isHRManager) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
};

export const optionalAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.user = { 
        id: decoded.id, 
        email: decoded.email, 
        role: decoded.role as 'ADMIN' | 'EMPLOYEE',
        jobRoles: decoded.jobRoles || [] 
      };
    } catch {
      // ignore
    }
  }
  next();
};
