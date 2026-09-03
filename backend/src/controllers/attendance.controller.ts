/**
 * Attendance Tracker controller.
 * Handles PDF upload, sheet listing, sheet data read/write, and Excel download.
 * Access restricted to HR and Admin roles.
 */
import { RequestHandler } from 'express';
import multer from 'multer';
import { success, error } from '../utils/response';
import { readMaster, writeMaster, savePdf } from '../services/attendance/fileStore';
import { parsePdfReport } from '../services/attendance/pdfParser';
import { generateExcel } from '../services/attendance/excelGenerator';
import { getAvailableSheets, readSheetData, saveSheetData } from '../services/attendance/excelReader';

// Multer in-memory storage (file stays in RAM, never hits disk until we choose to save)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
export const uploadMiddleware = upload.single('file');

/**
 * POST /api/attendance/upload-pdf
 */
export const uploadPdf: RequestHandler = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) { error(res, 'No file uploaded', 400); return; }
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      error(res, 'Only PDF files are allowed', 400);
      return;
    }

    // Archive the PDF
    savePdf(file.originalname, file.buffer);

    // Parse PDF
    const { attendanceData, datesList } = await parsePdfReport(file.buffer);

    // Load existing master (if any) and generate updated workbook
    const existingMaster = readMaster();
    const excelBuffer = await generateExcel(attendanceData, datesList, existingMaster);

    // Save updated master
    writeMaster(excelBuffer);

    // Return success with month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const mainSheetTitle = datesList.length > 0
      ? `${monthNames[datesList[0].getMonth()]} ${datesList[0].getFullYear()}`
      : 'Attendance';

    success(res, { month: mainSheetTitle }, 'PDF processed successfully');
  } catch (err: any) {
    if (err.message?.includes('Could not extract')) {
      error(res, err.message, 400);
      return;
    }
    next(err);
  }
};

/**
 * GET /api/attendance/get-sheets
 */
export const getSheets: RequestHandler = async (_req, res, next) => {
  try {
    const master = readMaster();
    if (!master) { success(res, { sheets: [] }); return; }
    const sheets = await getAvailableSheets(master);
    success(res, { sheets });
  } catch (err) { next(err); }
};

/**
 * GET /api/attendance/get-sheet-data/:sheetName
 */
export const getSheetData: RequestHandler = async (req, res, next) => {
  try {
    const master = readMaster();
    if (!master) { error(res, 'No master file found. Upload a PDF first.', 404); return; }

    const sheetName = req.params.sheetName as string;
    const data = await readSheetData(master, sheetName);
    if (!data) { error(res, 'Sheet data not found', 404); return; }
    success(res, data);
  } catch (err) { next(err); }
};

/**
 * POST /api/attendance/save-sheet/:sheetName
 */
export const saveSheet: RequestHandler = async (req, res, next) => {
  try {
    const master = readMaster();
    if (!master) { error(res, 'No master file found.', 404); return; }

    const sheetName = req.params.sheetName as string;
    const { headers, rows } = req.body;
    if (!headers || !rows) { error(res, 'Missing headers or rows', 400); return; }

    const updatedBuffer = await saveSheetData(master, sheetName, headers, rows);
    writeMaster(updatedBuffer);
    success(res, null, 'Saved successfully');
  } catch (err) { next(err); }
};

/**
 * GET /api/attendance/download-master
 */
export const downloadMaster: RequestHandler = (_req, res) => {
  const master = readMaster();
  if (!master) {
    error(res, 'File not found. Upload a PDF first.', 404);
    return;
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Mindcrew_Attendance_Master.xlsx');
  res.send(master);
};
