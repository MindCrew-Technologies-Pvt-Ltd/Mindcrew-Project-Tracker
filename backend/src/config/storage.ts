import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { UPLOAD_DIR } from './env';

/** Make sure the upload directory (Railway volume in prod) exists. */
export function ensureUploadDir(): void {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Persist an uploaded file buffer to the volume and return its stored filename.
 * Filenames are random UUIDs so they can be served publicly without being guessable.
 */
export function saveFile(buffer: Buffer, originalName: string): { filename: string } {
  ensureUploadDir();
  const ext = path.extname(originalName).slice(0, 20);
  const filename = `${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return { filename };
}

/** Remove a stored file by its filename (basename). Ignores missing files. */
export function deleteFile(filename: string): void {
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(filename)));
  } catch {
    /* file already gone — ignore */
  }
}
