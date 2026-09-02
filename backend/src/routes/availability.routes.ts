import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  upsertMyAvailability,
  getMyAvailability,
  getTodayMyAvailability,
  getAllAvailability,
} from '../controllers/availability.controller';

const router = Router();
router.use(authenticate);

// Employee routes
router.post('/', upsertMyAvailability);           // POST   /api/availability
router.get('/me', getMyAvailability);             // GET    /api/availability/me
router.get('/today', getTodayMyAvailability);     // GET    /api/availability/today

// Manager / Admin routes
router.get('/all', getAllAvailability);            // GET    /api/availability/all?date=&status=

export default router;
