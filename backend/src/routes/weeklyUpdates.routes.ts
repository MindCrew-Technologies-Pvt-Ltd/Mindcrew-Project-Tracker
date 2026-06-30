import { Router } from 'express';
import { getWeeklyUpdates, getWeeklyUpdate, createWeeklyUpdate, updateWeeklyUpdate, deleteWeeklyUpdate } from '../controllers/weeklyUpdates.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createWeeklyUpdateSchema, updateWeeklyUpdateSchema } from '../validations/schemas';

const router = Router();

router.get('/projects/:projectId/weekly-updates', authenticate, getWeeklyUpdates);
router.post('/projects/:projectId/weekly-updates', authenticate, validate(createWeeklyUpdateSchema), createWeeklyUpdate);
router.get('/weekly-updates/:id', authenticate, getWeeklyUpdate);
router.put('/weekly-updates/:id', authenticate, validate(updateWeeklyUpdateSchema), updateWeeklyUpdate);
router.delete('/weekly-updates/:id', authenticate, deleteWeeklyUpdate);

export default router;
