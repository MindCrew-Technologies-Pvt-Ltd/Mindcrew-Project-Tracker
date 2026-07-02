import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { saveFile, deleteFile } from '../config/storage';
import { success, error } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { AppError } from '../middleware/errorHandler';
import { assertProjectAccess } from '../utils/projectAccess';
import { DocumentCategory } from '@prisma/client';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;

export const getDocuments: RequestHandler = async (req, res, next) => {
  try {
    await assertProjectAccess(sp(req.params.projectId), req.user!);
    const where: Record<string, unknown> = { projectId: sp(req.params.projectId) };
    const cat = req.query.category;
    if (cat && typeof cat === 'string') where.category = cat as DocumentCategory;
    const docs = await prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, include: { uploadedBy: { select: { id: true, name: true, email: true } } } });
    success(res, docs);
  } catch (err) { next(err); }
};

export const uploadDocument: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) { error(res, 'No file provided', 400); return; }
    const projectId = sp(req.params.projectId);
    await assertProjectAccess(projectId, req.user!);
    const { category, description } = req.body;
    const { filename } = saveFile(req.file.buffer, req.file.originalname);
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
    const doc = await prisma.document.create({
      data: { projectId, uploadedById: req.user!.id, fileName: req.file.originalname, fileUrl, fileType: req.file.mimetype, fileSize: req.file.size, category: (category as DocumentCategory) ?? 'OTHER', description },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    });
    await logActivity({ userId: req.user!.id, action: 'UPLOAD', module: 'DOCUMENT', description: `Uploaded ${req.file.originalname}` });
    success(res, doc, 'Document uploaded', 201);
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
