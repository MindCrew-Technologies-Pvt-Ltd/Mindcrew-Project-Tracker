import { Router } from 'express';
import { getWeeklyUpdates, getWeeklyUpdate, createWeeklyUpdate, updateWeeklyUpdate, deleteWeeklyUpdate } from '../controllers/weeklyUpdates.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/projects/:projectId/weekly-updates', authenticate, getWeeklyUpdates);
router.post('/projects/:projectId/weekly-updates', authenticate, createWeeklyUpdate);
router.get('/weekly-updates/:id', authenticate, getWeeklyUpdate);
router.put('/weekly-updates/:id', authenticate, updateWeeklyUpdate);
router.delete('/weekly-updates/:id', authenticate, deleteWeeklyUpdate);

export default router;
