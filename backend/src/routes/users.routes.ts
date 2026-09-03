import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getManagers, getMyTeam, assignReportee, getMyManagers } from '../controllers/users.controller';

const router = Router();
router.use(authenticate);

router.get('/managers', getManagers);
router.get('/my-team', getMyTeam);
router.get('/my-managers', getMyManagers);
router.put('/assign-reportee', assignReportee);

export default router;
