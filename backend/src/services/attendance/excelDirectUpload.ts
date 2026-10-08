/**
 * Direct Excel Upload Service
 *
 * Parses a user-uploaded Excel workbook and copies ALL sheets that match the
 * selected month into the master attendance workbook (preserving colors).
 *
 * Sheet name matching (case-insensitive, flexible):
 *   Attendance : "September 2026"
 *   Leaves     : "September leaves 2026" / "September Leaves 2026"
 */
import ExcelJS from 'exceljs';

// Known status → ARGB color mapping (used when a cell has no fill)
const STATUS_COLORS: Record<string, string> = {
  'Weekly Off': 'FFFFC000',
  WO:           'FFFFC000',
  A:            'FFFF0000',
  SL:           'FFFFFF00',
  HD:           'FF92D050',
  WFH:          'FFCCC0DA',
  LWP:          'FFFF0000',
  'Comp Off':   'FF8EA9DB',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Build attendance sheet name e.g. "September 2026" */
export function buildSheetName(month: number, year: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

/** Build leaves sheet name e.g. "September leaves 2026" */
export function buildLeavesSheetName(month: number, year: number): string {
  return `${MONTHS[month - 1]} leaves ${year}`;
}

/**
 * Copy one worksheet from `uploaded` workbook into `master` workbook,
 * replacing an existing sheet of the same `targetName` if present.
 */
async function copySheet(
  master: ExcelJS.Workbook,
  sourceWs: ExcelJS.Worksheet,
  targetName: string,
): Promise<void> {
  // Remove existing sheet with same name
  const existingWs = master.getWorksheet(targetName);
  if (existingWs) master.removeWorksheet(existingWs.id);

  const targetWs = master.addWorksheet(targetName);

  // Copy column widths
  sourceWs.columns.forEach((col, idx) => {
    const targetCol = targetWs.getColumn(idx + 1);
    if (col.width) targetCol.width = col.width;
  });

  // Copy rows: values + styles + fills + borders
  sourceWs.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const targetRow = targetWs.getRow(rowNumber);
    if (row.height) targetRow.height = row.height;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber);

      // Value
      targetCell.value = cell.value;

      // Full style (font, alignment, numFmt, fill)
      if (cell.style) {
        try {
          targetCell.style = JSON.parse(JSON.stringify(cell.style));
        } catch {
          // fallback — copy individually
        }
      }

      // Ensure status cells always have the right background fill
      const cellValue = typeof cell.value === 'string' ? cell.value.trim() : '';
      const fp = targetCell.fill as ExcelJS.FillPattern | undefined;
      const hasSolidFill =
        fp?.pattern === 'solid' &&
        fp.fgColor?.argb &&
        !['FFFFFFFF', 'FF000000', '00000000'].includes(fp.fgColor.argb);

      if (!hasSolidFill && STATUS_COLORS[cellValue]) {
        targetCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: STATUS_COLORS[cellValue] },
        };
      }

      // Always ensure thin border for grid appearance
      targetCell.border = {
        top:    { style: 'thin' },
        bottom: { style: 'thin' },
        left:   { style: 'thin' },
        right:  { style: 'thin' },
      };
    });

    targetRow.commit();
  });

  // Copy merged cell regions
  const merges: Record<string, ExcelJS.Range> = (sourceWs as any)._merges || {};
  Object.keys(merges).forEach((key) => {
    const m = merges[key];
    if (m) {
      try { targetWs.mergeCells(m.top, m.left, m.bottom, m.right); } catch { /* ignore */ }
    }
  });
}

/**
 * Find a worksheet in the uploaded workbook whose name matches the given pattern
 * (case-insensitive). Returns undefined if not found.
 *
 * Matching strategy (tried in order):
 *  1. Exact match
 *  2. Case-insensitive exact match
 *  3. Sheet name contains both the month name and the year
 */
function findSheet(
  wb: ExcelJS.Workbook,
  month: number,
  year: number,
  isLeaves: boolean,
): ExcelJS.Worksheet | undefined {
  const monthName = MONTHS[month - 1].toLowerCase();
  const yearStr   = String(year);

  return wb.worksheets.find(ws => {
    const name = ws.name.toLowerCase().trim();
    const hasMonth = name.includes(monthName);
    const hasYear  = name.includes(yearStr);
    const hasLeaves = name.includes('leave');

    if (!hasMonth || !hasYear) return false;
    return isLeaves ? hasLeaves : !hasLeaves;
  });
}

/**
 * Merge the uploaded Excel buffer into the master workbook buffer.
 * Copies both the attendance sheet and the leaves sheet for the given month.
 *
 * @param masterBuffer   Existing master (may be null)
 * @param uploadBuffer   The Excel file the user uploaded
 * @param month          1–12
 * @param year           e.g. 2026
 * @returns { buffer, copiedSheets }
 */
export async function mergeUploadedSheet(
  masterBuffer: Buffer | null,
  uploadBuffer: Buffer,
  month: number,
  year: number,
): Promise<{ buffer: Buffer; copiedSheets: string[] }> {
  // Load master
  const master = new ExcelJS.Workbook();
  if (masterBuffer) await master.xlsx.load(masterBuffer as any);

  // Load uploaded file
  const uploaded = new ExcelJS.Workbook();
  await uploaded.xlsx.load(uploadBuffer as any);

  if (uploaded.worksheets.length === 0) throw new Error('Uploaded Excel has no sheets.');

  const copiedSheets: string[] = [];

  // --- Attendance sheet ---
  const attTargetName = buildSheetName(month, year);        // "September 2026"
  const attSource     = findSheet(uploaded, month, year, false);

  if (attSource) {
    await copySheet(master, attSource, attTargetName);
    copiedSheets.push(attTargetName);
  } else {
    // Fallback: if user uploaded a single-sheet file, use that sheet as attendance
    if (uploaded.worksheets.length === 1) {
      await copySheet(master, uploaded.worksheets[0], attTargetName);
      copiedSheets.push(attTargetName);
    }
  }

  // --- Leaves sheet ---
  const leavesTargetName = buildLeavesSheetName(month, year); // "September leaves 2026"
  const leavesSource     = findSheet(uploaded, month, year, true);

  if (leavesSource) {
    await copySheet(master, leavesSource, leavesTargetName);
    copiedSheets.push(leavesTargetName);
  }

  const buffer = await master.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), copiedSheets };
}
