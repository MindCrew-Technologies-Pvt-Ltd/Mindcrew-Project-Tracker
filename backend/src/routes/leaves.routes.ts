import { Router } from 'express';
import { createLeaveRequest, getMyLeaveRequests, getTeamLeaveRequests, updateLeaveStatus } from '../controllers/leaves.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLeaveRequestSchema } from '../validations/schemas';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

router.post('/', validate(createLeaveRequestSchema), createLeaveRequest);
router.get('/my-requests', getMyLeaveRequests);
router.get('/team-requests', getTeamLeaveRequests);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('APPROVED', 'REJECTED').required()
});

router.put('/:id/status', validate(updateStatusSchema), updateLeaveStatus);

export default router;
