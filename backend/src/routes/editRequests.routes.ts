import { Router } from 'express';
import { getEditRequests, approveEditRequest, rejectEditRequest } from '../controllers/editRequests.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Project owners review requests for their own projects from the project's
// Edit Requests tab. Authorization is enforced in the controller: listing
// requires a projectId for non-admins, and approve/reject require being the
// project owner or an admin. (Admins also have /api/admin/edit-requests.)
router.get('/', authenticate, getEditRequests);
router.put('/:id/approve', authenticate, approveEditRequest);
router.put('/:id/reject', authenticate, rejectEditRequest);

export default router;
