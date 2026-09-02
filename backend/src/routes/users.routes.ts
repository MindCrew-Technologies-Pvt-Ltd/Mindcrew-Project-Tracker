import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getManagers, getMyTeam, assignReportee } from '../controllers/users.controller';

const router = Router();
router.use(authenticate);

router.get('/managers', getManagers);
router.get('/my-team', getMyTeam);
router.put('/assign-reportee', assignReportee);

export default router;
