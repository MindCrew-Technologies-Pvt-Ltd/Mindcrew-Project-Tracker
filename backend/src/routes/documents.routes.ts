import { Router } from 'express';
import { getDocuments, uploadDocument, deleteDocument } from '../controllers/documents.controller';
import { authenticate } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';

const router = Router();

router.get('/projects/:projectId/documents', authenticate, getDocuments);
router.post('/projects/:projectId/documents', authenticate, uploadSingle, uploadDocument);
router.delete('/documents/:id', authenticate, deleteDocument);

export default router;
