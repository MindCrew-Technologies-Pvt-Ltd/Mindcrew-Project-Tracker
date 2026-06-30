import { Router } from 'express';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, updateFcmToken } from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/mark-all-read', authenticate, markAllAsRead);
router.put('/fcm-token', authenticate, updateFcmToken);
router.put('/:id', authenticate, markAsRead);

export default router;
