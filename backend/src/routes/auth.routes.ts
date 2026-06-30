import { Router } from 'express';
import { signup, login, logout, getMe, forgotPassword, resetPassword, changePassword, refreshToken } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/signup', signup);
router.post('/login', authLimiter, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticate, changePassword);
router.post('/refresh-token', refreshToken);

export default router;
