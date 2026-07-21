import { RequestHandler } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import prisma from '../config/prisma';

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

/** Throttled lastUsedAt updates: at most one write per token per 5 minutes. */
const lastTouched = new Map<string, number>();

/**
 * Authenticates personal API tokens (`Authorization: Bearer ptk_...`) used by
 * AI agents (MCP) and scripts. Sets req.user in the same shape as the JWT
 * middleware so downstream logic is shared.
 */
export const apiTokenAuth: RequestHandler = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ptk_')) {
      res.status(401).json({ success: false, message: 'A personal API token is required (Authorization: Bearer ptk_...)' });
      return;
    }
    const raw = header.slice('Bearer '.length).trim();
    const token = await prisma.apiToken.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
    });
    if (!token || token.revokedAt || !token.user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid or revoked API token' });
      return;
    }
    req.user = { id: token.user.id, email: token.user.email, role: token.user.role };
    const now = Date.now();
    if ((lastTouched.get(token.id) ?? 0) < now - 5 * 60_000) {
      lastTouched.set(token.id, now);
      prisma.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    }
    next();
  } catch (err) { next(err); }
};

/** 60 requests/minute per token (falls back to IP when the header is absent). */
export const apiTokenLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers.authorization?.slice(-24) ?? req.ip ?? 'anon',
});
