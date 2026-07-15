import { Router } from 'express';
import { getDocuments, uploadDocument, downloadDocument, deleteDocument } from '../controllers/documents.controller';
import { authenticate } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';

const router = Router();

router.get('/projects/:projectId/documents', authenticate, getDocuments);
router.post('/projects/:projectId/documents', authenticate, uploadSingle, uploadDocument);
router.get('/documents/:id/download', authenticate, downloadDocument);
router.delete('/documents/:id', authenticate, deleteDocument);

export default router;
