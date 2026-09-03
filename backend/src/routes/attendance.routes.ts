import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../config/prisma';
import { RequestHandler } from 'express';
import {
  uploadMiddleware,
  uploadPdf,
  getSheets,
  getSheetData,
  saveSheet,
  downloadMaster,
  sendReport,
} from '../controllers/attendance.controller';

const router = Router();

/**
 * Middleware: Only HR and Admin can access attendance tracker.
 * Checks user.role === 'ADMIN' or user.jobRoles includes 'HR'.
 */
const requireHrOrAdmin: RequestHandler = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const isAdmin = user?.role === 'ADMIN' || user?.jobRoles?.some(r => r.toUpperCase() === 'ADMIN');
    const isHR = user?.jobRoles?.some(
      (r: string) => r.toUpperCase() === 'HR' || r.toUpperCase().includes('HR')
    );
    if (!isAdmin && !isHR) {
      res.status(403).json({ success: false, message: 'Access denied. HR and Admin only.' });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};

// All routes require authentication + HR/Admin role
router.use(authenticate, requireHrOrAdmin);

router.post('/upload-pdf', uploadMiddleware, uploadPdf);
router.get('/get-sheets', getSheets);
router.get('/get-sheet-data/:sheetName', getSheetData);
router.post('/save-sheet/:sheetName', saveSheet);
router.get('/download-master', downloadMaster);
router.post('/send-report', sendReport);

export default router;
