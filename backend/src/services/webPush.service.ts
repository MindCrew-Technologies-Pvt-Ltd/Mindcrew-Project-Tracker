import webpush from 'web-push';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } from '../config/env';
import logger from '../config/logger';

// Initialize web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info('Web Push (VAPID) initialized');
} else {
  logger.warn('VAPID keys not set — Web Push notifications disabled');
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string; // URL to open when notification is clicked
  tag?: string; // unique tag to prevent duplicate notifications
}

/**
 * Send a push notification to a single push subscription JSON string.
 */
export async function sendWebPushNotification(
  subscriptionJson: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  try {
    const subscription = JSON.parse(subscriptionJson) as webpush.PushSubscription;
    await webpush.sendNotification(subscription, JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon ?? '/icon-192.png',
      badge: payload.badge ?? '/icon-192.png',
      url: payload.url ?? '/',
      tag: payload.tag ?? 'general',
    }));
  } catch (err: any) {
    // 410 Gone = subscription expired/unsubscribed — caller should clean it up
    if (err?.statusCode === 410) {
      logger.warn('Push subscription gone (expired), should be removed from DB');
      throw Object.assign(err, { isGone: true });
    }
    logger.error('Failed to send web push notification:', err);
  }
}

/**
 * Send push notifications to multiple subscriptions.
 * Silently skips failed ones (e.g., expired subscriptions).
 */
export async function sendWebPushToMany(
  subscriptionJsons: string[],
  payload: PushPayload
): Promise<void> {
  await Promise.allSettled(
    subscriptionJsons.map((sub) => sendWebPushNotification(sub, payload))
  );
}

export const VAPID_PUB_KEY = VAPID_PUBLIC_KEY;
