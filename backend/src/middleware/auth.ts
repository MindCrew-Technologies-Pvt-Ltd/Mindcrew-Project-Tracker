import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

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

export const requireAdmin: RequestHandler = (req, res, next) => {
  const hasAdminRole = req.user?.role === 'ADMIN' || req.user?.jobRoles?.includes('Admin');
  if (!hasAdminRole) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
};

export const requireAdminOrHR: RequestHandler = (req, res, next) => {
  const hasAdminRole = req.user?.role === 'ADMIN' || req.user?.jobRoles?.includes('Admin');
  const isHRManager = req.user?.jobRoles?.some(r => r.toUpperCase() === 'HR') && req.user?.jobRoles?.some(r => r.toUpperCase() === 'MANAGER');
  
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
