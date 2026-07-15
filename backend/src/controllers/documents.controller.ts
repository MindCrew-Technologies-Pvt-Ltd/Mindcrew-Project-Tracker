import { RequestHandler } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma';
import { UPLOAD_DIR } from '../config/env';
import { deleteFile } from '../config/storage';
import { success, error } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { assertProjectExists, assertProjectWriteAccess } from '../utils/projectAccess';
import { DocumentCategory } from '@prisma/client';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;

export const getDocuments: RequestHandler = async (req, res, next) => {
  try {
    await assertProjectExists(sp(req.params.projectId));
    const where: Record<string, unknown> = { projectId: sp(req.params.projectId) };
    const cat = req.query.category;
    if (cat && typeof cat === 'string') where.category = cat as DocumentCategory;
    const docs = await prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, include: { uploadedBy: { select: { id: true, name: true, email: true } } } });
    success(res, docs);
  } catch (err) { next(err); }
};

export const uploadDocument: RequestHandler = async (req, res, next) => {
  // multer's diskStorage has already written the file when this runs, so every
  // rejection path must remove it again or the volume collects orphans.
  const cleanup = () => { if (req.file?.filename) deleteFile(req.file.filename); };
  try {
    if (!req.file) { error(res, 'No file provided', 400); return; }
    const projectId = sp(req.params.projectId);
    try {
      await assertProjectWriteAccess(projectId, req.user!);
    } catch (err) { cleanup(); return next(err); }
    const { category, description } = req.body;
    // Validate against the enum instead of blind-casting — an unknown value
    // used to crash inside Prisma as a 500 (e.g. "SRS" before it was added).
    if (category && !Object.values(DocumentCategory).includes(category)) {
      cleanup();
      error(res, `Invalid category. Use one of: ${Object.values(DocumentCategory).join(', ')}`, 400); return;
    }
    const filename = req.file.filename;
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    const doc = await prisma.document.create({
      data: { projectId, uploadedById: req.user!.id, fileName: req.file.originalname, fileUrl, fileType: req.file.mimetype, fileSize: req.file.size, category: (category as DocumentCategory) ?? 'OTHER', description },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    await logActivity({ userId: req.user!.id, action: 'UPLOAD', module: 'DOCUMENT', description: `Uploaded ${req.file.originalname}` });
    success(res, doc, 'Document uploaded', 201);
  } catch (err) { cleanup(); next(err); }
};

// Authenticated download: files are not served publicly from /uploads — any
// logged-in user may download (matching the view-all project visibility model).
export const downloadDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: sp(req.params.id) } });
    if (!doc) return next(new AppError('Document not found', 404));
    const stored = path.basename(doc.fileUrl.split('/uploads/')[1] ?? '');
    const filePath = stored ? path.join(UPLOAD_DIR, stored) : '';
    if (!stored || !fs.existsSync(filePath)) return next(new AppError('Document file missing', 404));
    res.download(filePath, doc.fileName);
  } catch (err) { next(err); }
};

export const deleteDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: sp(req.params.id) } });
    if (!doc) return next(new AppError('Document not found', 404));
    if (doc.uploadedById !== req.user!.id && req.user?.role !== 'ADMIN') return next(new AppError('Forbidden', 403));
    await prisma.document.delete({ where: { id: sp(req.params.id) } });
    deleteFile(doc.fileUrl.split('/uploads/')[1] ?? '');
    success(res, null, 'Document deleted');
  } catch (err) { next(err); }
};
