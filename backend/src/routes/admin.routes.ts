import { Router } from 'express';
import { authenticate, requireAdmin, requireAdminOrHR } from '../middleware/auth';
import { getUsers, getUser, updateUser, deactivateUser, resetUserPassword, deleteUser } from '../controllers/users.controller';
import { getEditRequests, getEditRequest, approveEditRequest, rejectEditRequest } from '../controllers/editRequests.controller';
import { generateReport, exportReport, getEmployeeAnalytics } from '../controllers/reports.controller';
import { getActivityLogs } from '../controllers/activityLogs.controller';
import { validate } from '../middleware/validate';
import { updateUserSchema, adminResetPasswordSchema } from '../validations/schemas';

const router = Router();
router.use(authenticate);

// Allow Admin or HR Manager to fetch the user list (needed for Flexible Resources)
router.get('/users', requireAdminOrHR, getUsers);
router.get('/users/:id', requireAdmin, getUser);
router.put('/users/:id', requireAdmin, validate(updateUserSchema), updateUser);
router.put('/users/:id/deactivate', requireAdmin, deactivateUser);
router.put('/users/:id/reset-password', requireAdmin, validate(adminResetPasswordSchema), resetUserPassword);
router.delete('/users/:id', requireAdmin, deleteUser);

router.get('/edit-requests', requireAdmin, getEditRequests);
router.get('/edit-requests/:id', requireAdmin, getEditRequest);
router.put('/edit-requests/:id/approve', requireAdmin, approveEditRequest);
router.put('/edit-requests/:id/reject', requireAdmin, rejectEditRequest);

router.post('/reports/generate', requireAdmin, generateReport);
router.post('/reports/export', requireAdmin, exportReport);
router.get('/employee-analytics', requireAdmin, getEmployeeAnalytics);

router.get('/activity-logs', requireAdmin, getActivityLogs);

export default router;
