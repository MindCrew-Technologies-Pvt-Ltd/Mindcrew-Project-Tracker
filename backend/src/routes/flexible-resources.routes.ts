import { Router } from 'express';
import { authenticate, requireAdminOrHR } from '../middleware/auth';
import { getFlexibleResources, addFlexibleResource, removeFlexibleResource } from '../controllers/flexibleResources.controller';

const router = Router();

// Only ADMIN and HR Manager can access flexible resources
router.use(authenticate, requireAdminOrHR);

router.get('/', getFlexibleResources);
router.post('/', addFlexibleResource);
router.delete('/:userId', removeFlexibleResource);

export default router;
