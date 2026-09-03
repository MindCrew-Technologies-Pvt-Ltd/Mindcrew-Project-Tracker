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
import prisma from '../config/prisma';
import nodemailer from 'nodemailer';

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

    // Fetch approved WFH leaves for the month
    const startOfMonth = datesList[0];
    const endOfMonth = datesList[datesList.length - 1];
    const wfhRequests = await prisma.leaveRequest.findMany({
      where: {
        type: 'WFH',
        status: 'APPROVED',
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth }
      },
      include: { user: true }
    });

    const wfhLeaves = wfhRequests.flatMap(req => {
      const leaves = [];
      const empNumId = (req.user.employeeId?.match(/\d+/) || [''])[0];
      if (!empNumId) return [];

      let curr = new Date(req.startDate);
      const end = new Date(req.endDate);
      while (curr <= end) {
        leaves.push({
          employeeId: empNumId,
          date: new Date(curr),
          type: 'WFH'
        });
        curr.setDate(curr.getDate() + 1);
      }
      return leaves;
    });

    // Load existing master (if any) and generate updated workbook
    const existingMaster = readMaster();
    const excelBuffer = await generateExcel(attendanceData, datesList, existingMaster, wfhLeaves);

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

/**
 * POST /api/attendance/send-report
 */
export const sendReport: RequestHandler = async (_req, res, next) => {
  try {
    const master = readMaster();
    if (!master) { error(res, 'File not found. Upload a PDF first.', 404); return; }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Get all users with emails
    const users = await prisma.user.findMany({
      where: { isActive: true, email: { not: '' } },
      select: { email: true }
    });
    
    if (users.length === 0) {
      error(res, 'No users found with email addresses', 400); return;
    }

    const bccList = users.map(u => u.email).join(', ');
    const monthName = new Date().toLocaleString('default', { month: 'long' });

    await transporter.sendMail({
      from: `"Mindcrew Tracker" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to self, BCC everyone else
      bcc: bccList,
      subject: `${monthName} Leave Calendar`,
      text: `Hello Team,\n\nPlease find attached the attendance and leave calendar for ${monthName}.\n\nBest Regards,\nHR Team`,
      attachments: [
        {
          filename: `Attendance_Master_${monthName}.xlsx`,
          content: master
        }
      ]
    });

    success(res, null, 'Report sent successfully to all employees');
  } catch (err: any) {
    console.error('Email error:', err);
    error(res, err.message || 'Failed to send email report', 500);
  }
};
