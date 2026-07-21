import { RequestHandler } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { hashToken } from '../middleware/apiTokenAuth';

const sp = (v: string | string[]): string => (Array.isArray(v) ? v[0]! : v);

export const listTokens: RequestHandler = async (req, res, next) => {
  try {
    const tokens = await prisma.apiToken.findMany({
      where: { userId: req.user!.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    });
    success(res, tokens);
  } catch (err) { next(err); }
};

export const createToken: RequestHandler = async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2) { error(res, 'Give the token a name (e.g. "Claude Code on laptop")', 400); return; }
    const active = await prisma.apiToken.count({ where: { userId: req.user!.id, revokedAt: null } });
    if (active >= 10) { error(res, 'Token limit reached (10) — revoke one you no longer use', 400); return; }
    const raw = `ptk_${crypto.randomBytes(20).toString('hex')}`;
    const token = await prisma.apiToken.create({
      data: { userId: req.user!.id, name, tokenHash: hashToken(raw), prefix: raw.slice(0, 12) },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });
    await logActivity({ userId: req.user!.id, action: 'CREATE', module: 'API_TOKEN', description: `Created API token "${name}"` });
    // The raw token is returned exactly once — only the hash is stored.
    success(res, { ...token, token: raw }, 'Token created — copy it now, it will not be shown again', 201);
  } catch (err) { next(err); }
};

export const revokeToken: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const token = await prisma.apiToken.findUnique({ where: { id } });
    if (!token || token.userId !== req.user!.id) return next(new AppError('Token not found', 404));
    if (token.revokedAt) { error(res, 'Token is already revoked', 400); return; }
    await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
    await logActivity({ userId: req.user!.id, action: 'REVOKE', module: 'API_TOKEN', description: `Revoked API token "${token.name}"` });
    success(res, null, 'Token revoked');
  } catch (err) { next(err); }
};
