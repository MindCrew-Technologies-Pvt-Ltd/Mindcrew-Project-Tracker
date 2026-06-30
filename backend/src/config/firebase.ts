import { initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } from './env';
import logger from './logger';

let app: App | null = null;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  try {
    app = initializeApp({
      credential: cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: FIREBASE_PRIVATE_KEY }),
    });
    logger.info('Firebase Admin SDK initialized');
  } catch (err) {
    logger.error('Firebase init failed:', err);
  }
} else {
  logger.warn('Firebase env vars not set — push notifications disabled');
}

export async function sendPushNotification(fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  if (!app) return;
  try {
    await getMessaging(app).send({ token: fcmToken, notification: { title, body }, ...(data ? { data } : {}) });
  } catch (err) {
    logger.error('Push notification failed:', err);
  }
}

export default app;
