import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
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
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role as 'ADMIN' | 'EMPLOYEE' };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
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
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role as 'ADMIN' | 'EMPLOYEE' };
    } catch {
      // ignore
    }
  }
  next();
};
