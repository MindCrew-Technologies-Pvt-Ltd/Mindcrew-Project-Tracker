import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR } from './env';

/** Make sure the upload directory (Railway volume in prod) exists. */
export function ensureUploadDir(): void {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** Remove a stored file by its filename (basename). Ignores missing files. */
export function deleteFile(filename: string): void {
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(filename)));
  } catch {
    /* file already gone — ignore */
  }
}
