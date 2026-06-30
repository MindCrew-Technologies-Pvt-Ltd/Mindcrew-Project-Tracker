import multer from 'multer';

const storage = multer.memoryStorage();
const limits = { fileSize: 10 * 1024 * 1024 };

export const uploadSingle = multer({ storage, limits }).single('file');
export const uploadMultiple = multer({ storage, limits }).array('files', 10);
