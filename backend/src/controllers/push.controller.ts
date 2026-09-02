import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { VAPID_PUB_KEY } from '../services/webPush.service';

/**
 * GET /api/push/vapid-public-key
 * Returns the VAPID public key so the frontend can subscribe.
 */
export const getVapidPublicKey: RequestHandler = (_req, res) => {
  if (!VAPID_PUB_KEY) {
    error(res, 'Push notifications not configured on server', 503);
    return;
  }
  success(res, { publicKey: VAPID_PUB_KEY });
};

/**
 * POST /api/push/subscribe
 * Saves (or updates) the user's push subscription in the DB.
 * Body: { subscription: PushSubscriptionJSON }
 */
export const savePushSubscription: RequestHandler = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      error(res, 'Invalid push subscription object', 400);
      return;
    }

    await (prisma.user.update as any)({
      where: { id: req.user!.id },
      data: { pushSubscription: JSON.stringify(subscription) },
    });

    success(res, null, 'Push subscription saved successfully');
  } catch (err) { next(err); }
};

/**
 * DELETE /api/push/unsubscribe
 * Removes the user's push subscription from the DB (user denies permission).
 */
export const removePushSubscription: RequestHandler = async (req, res, next) => {
  try {
    await (prisma.user.update as any)({
      where: { id: req.user!.id },
      data: { pushSubscription: null },
    });
    success(res, null, 'Push subscription removed');
  } catch (err) { next(err); }
};
