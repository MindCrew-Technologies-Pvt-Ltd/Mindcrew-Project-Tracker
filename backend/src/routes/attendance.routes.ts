import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../config/prisma';
import { RequestHandler } from 'express';
import {
  uploadMiddleware,
  uploadExcelMiddleware,
  uploadPdf,
  getSheets,
  getSheetData,
  saveSheet,
  downloadMaster,
  sendReport,
  deleteMasterFile,
  uploadDirectExcel,
} from '../controllers/attendance.controller';

const router = Router();

/**
 * Middleware: Only HR and Admin can access attendance tracker.
 * Checks user.role === 'ADMIN' or user.jobRoles includes 'HR'.
 */
const requireHrOrAdmin: RequestHandler = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const isAdmin = user?.role === 'ADMIN' || user?.jobRoles?.includes('Admin');
    const hasHR = user?.jobRoles?.some((r: string) => r.toUpperCase().includes('HR'));
    const hasManager = user?.jobRoles?.some((r: string) => r.toUpperCase().includes('MANAGER'));
    
    if (!isAdmin && !(hasHR && hasManager)) {
      res.status(403).json({ success: false, message: 'Access denied. HR+Manager and Admin only.' });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};

// All routes require authentication
router.use(authenticate);

// Read-only routes (accessible to all authenticated users)
router.get('/get-sheets', getSheets);
router.get('/get-sheet-data/:sheetName', getSheetData);
router.get('/download-master', downloadMaster);

// Write/Edit routes (restricted to HR/Admin)
router.post('/upload-pdf', requireHrOrAdmin, uploadMiddleware, uploadPdf);
router.post('/upload-excel', requireHrOrAdmin, uploadExcelMiddleware, uploadDirectExcel);
router.post('/save-sheet/:sheetName', requireHrOrAdmin, saveSheet);
router.post('/send-report', requireHrOrAdmin, sendReport);
router.delete('/delete-master', requireHrOrAdmin, deleteMasterFile);

export default router;
