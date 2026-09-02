import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getVapidPublicKey, savePushSubscription, removePushSubscription } from '../controllers/push.controller';

const router = Router();

// All routes require authentication
router.get('/vapid-public-key', authenticate, getVapidPublicKey);
router.post('/subscribe', authenticate, savePushSubscription);
router.delete('/unsubscribe', authenticate, removePushSubscription);

export default router;
