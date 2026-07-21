import { Router } from 'express';
import { apiTokenAuth, apiTokenLimiter } from '../middleware/apiTokenAuth';
import { validate } from '../middleware/validate';
import { workLogSchema } from '../validations/schemas';
import { getProjects, postWorkLog, getMyWeek } from '../controllers/integrations.controller';

// Personal-API-token surface used by AI agents (MCP wraps the same functions)
// and scripts. JWT sessions are NOT accepted here.
const router = Router();
router.use(apiTokenLimiter, apiTokenAuth);

router.get('/projects', getProjects);
router.post('/work-log', validate(workLogSchema), postWorkLog);
router.get('/my-week', getMyWeek);

export default router;
