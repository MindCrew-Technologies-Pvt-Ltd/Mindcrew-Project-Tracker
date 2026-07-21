import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listTokens, createToken, revokeToken } from '../controllers/apiTokens.controller';

// Token MANAGEMENT is a logged-in browser action (JWT), never token-authed —
// a leaked token must not be able to mint more tokens.
const router = Router();
router.use(authenticate);

router.get('/', listTokens);
router.post('/', createToken);
router.delete('/:id', revokeToken);

export default router;
