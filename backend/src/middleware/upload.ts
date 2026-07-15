import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { UPLOAD_DIR } from '../config/env';
import { ensureUploadDir } from '../config/storage';

// Files stream straight to the volume (never buffered in RAM) under a random
// UUID name — important now that videos up to 100MB are allowed.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 20);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const limits = { fileSize: 100 * 1024 * 1024 };

export const uploadSingle = multer({ storage, limits }).single('file');
export const uploadMultiple = multer({ storage, limits }).array('files', 10);
