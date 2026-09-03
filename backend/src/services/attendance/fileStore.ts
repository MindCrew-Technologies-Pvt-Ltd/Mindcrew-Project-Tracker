/**
 * File-system based storage for attendance master Excel and uploaded PDFs.
 * Replaces Vercel Blob with local filesystem (Railway Volume in production).
 */
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR } from '../../config/env';

const ATT_DIR = path.join(UPLOAD_DIR, 'attendance');
const MASTER_PATH = path.join(ATT_DIR, 'Mindcrew_Attendance_Master.xlsx');
const PDF_DIR = path.join(ATT_DIR, 'pdfs');

/** Ensure directories exist */
function ensureDirs() {
  fs.mkdirSync(ATT_DIR, { recursive: true });
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

/** Save uploaded PDF (archival) */
export function savePdf(filename: string, data: Buffer): void {
  ensureDirs();
  fs.writeFileSync(path.join(PDF_DIR, filename), data);
}

/** Read master Excel bytes. Returns null if not found. */
export function readMaster(): Buffer | null {
  ensureDirs();
  if (!fs.existsSync(MASTER_PATH)) return null;
  return fs.readFileSync(MASTER_PATH);
}

/** Write master Excel bytes. */
export function writeMaster(data: Buffer): void {
  ensureDirs();
  fs.writeFileSync(MASTER_PATH, data);
}
