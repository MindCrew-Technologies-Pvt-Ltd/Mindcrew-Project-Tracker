import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { getUsers, getUser, updateUser, deactivateUser, resetUserPassword } from '../controllers/users.controller';
import { getEditRequests, getEditRequest, approveEditRequest, rejectEditRequest } from '../controllers/editRequests.controller';
import { generateReport, exportReport } from '../controllers/reports.controller';
import { getActivityLogs } from '../controllers/activityLogs.controller';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.put('/users/:id/deactivate', deactivateUser);
router.put('/users/:id/reset-password', resetUserPassword);

router.get('/edit-requests', getEditRequests);
router.get('/edit-requests/:id', getEditRequest);
router.put('/edit-requests/:id/approve', approveEditRequest);
router.put('/edit-requests/:id/reject', rejectEditRequest);

router.post('/reports/generate', generateReport);
router.post('/reports/export', exportReport);

router.get('/activity-logs', getActivityLogs);

export default router;
