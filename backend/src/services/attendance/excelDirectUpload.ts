/**
 * Direct Excel Upload Service
 * 
 * Parses a user-uploaded Excel sheet and merges it (as a new sheet)
 * into the master attendance workbook, preserving cell colors.
 * If a sheet with the same month name already exists it is replaced.
 */
import ExcelJS from 'exceljs';

// Known status → ARGB color mapping (used when a cell has no fill)
const STATUS_COLORS: Record<string, string> = {
  'Weekly Off': 'FFFFC000',
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

/**
 * Build the sheet name that will appear in the master workbook tab.
 * Format:  "September 2026"  (to match what the PDF processor creates)
 */
export function buildSheetName(month: number, year: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

/**
 * Merge the uploaded Excel buffer into the master workbook buffer.
 *
 * @param masterBuffer  Existing master (may be null if no master exists yet)
 * @param uploadBuffer  The Excel file the user uploaded
 * @param sheetName     The target sheet name ("September 2026")
 * @returns Updated master workbook buffer
 */
export async function mergeUploadedSheet(
  masterBuffer: Buffer | null,
  uploadBuffer: Buffer,
  sheetName: string,
): Promise<Buffer> {
  // --- Load master (or create empty) ---
  const master = new ExcelJS.Workbook();
  if (masterBuffer) {
    await master.xlsx.load(masterBuffer as any);
  }

  // --- Load the uploaded file ---
  const uploaded = new ExcelJS.Workbook();
  await uploaded.xlsx.load(uploadBuffer as any);

  // Use the first sheet in the uploaded file
  const sourceWs = uploaded.worksheets[0];
  if (!sourceWs) throw new Error('Uploaded Excel has no sheets.');

  // --- Remove the existing sheet with the same name (override) ---
  const existingWs = master.getWorksheet(sheetName);
  if (existingWs) {
    master.removeWorksheet(existingWs.id);
  }

  // --- Create fresh target sheet in master ---
  const targetWs = master.addWorksheet(sheetName);

  // Copy column widths
  sourceWs.columns.forEach((col, idx) => {
    const targetCol = targetWs.getColumn(idx + 1);
    if (col.width) targetCol.width = col.width;
  });

  // Copy row heights + all cell data (values, styles, fills, borders)
  sourceWs.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const targetRow = targetWs.getRow(rowNumber);
    if (row.height) targetRow.height = row.height;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber);

      // --- Copy value ---
      targetCell.value = cell.value;

      // --- Copy full style (font, alignment, numFmt) ---
      if (cell.style) {
        targetCell.style = JSON.parse(JSON.stringify(cell.style));
      }

      // --- Ensure fill is present for known statuses ---
      const cellValue = typeof cell.value === 'string' ? cell.value.trim() : '';
      const hasFill =
        cell.fill &&
        (cell.fill as ExcelJS.FillPattern).pattern === 'solid' &&
        (cell.fill as ExcelJS.FillPattern).fgColor?.argb &&
        (cell.fill as ExcelJS.FillPattern).fgColor!.argb !== 'FF000000' &&
        (cell.fill as ExcelJS.FillPattern).fgColor!.argb !== 'FFFFFFFF' &&
        (cell.fill as ExcelJS.FillPattern).fgColor!.argb !== '00000000';

      if (!hasFill && STATUS_COLORS[cellValue]) {
        targetCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: STATUS_COLORS[cellValue] },
        };
      }

      // Always apply thin border so the grid looks clean
      targetCell.border = {
        top:    { style: 'thin' },
        bottom: { style: 'thin' },
        left:   { style: 'thin' },
        right:  { style: 'thin' },
      };
    });

    targetRow.commit();
  });

  // Copy merged-cell regions
  // @ts-ignore — mergeCells is internal but works fine
  if (sourceWs.mergeCells) {
    // ExcelJS exposes _merges as an object
    const merges: Record<string, ExcelJS.Range> = (sourceWs as any)._merges || {};
    Object.keys(merges).forEach((key) => {
      const m = merges[key];
      if (m) {
        try {
          targetWs.mergeCells(m.top, m.left, m.bottom, m.right);
        } catch {
          /* ignore duplicate merge errors */
        }
      }
    });
  }

  const buffer = await master.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Read the uploaded Excel sheet data in the same format as readSheetData()
 * so the frontend table can display it immediately.
 */
export async function readUploadedSheetPreview(
  uploadBuffer: Buffer,
): Promise<{ headers: string[]; rows: { value: string; color: string | null }[][] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(uploadBuffer as any);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('No sheet found in uploaded file.');

  const headers: string[] = [];
  const rows: { value: string; color: string | null }[][] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowData: { value: string; color: string | null }[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      let value = '';
      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'object' && 'result' in cell.value) {
          value = String((cell.value as any).result ?? '');
        } else {
          value = String(cell.value);
        }
      }

      let color: string | null = null;
      const fp = cell.fill as ExcelJS.FillPattern | undefined;
      if (fp?.pattern === 'solid' && fp.fgColor?.argb) {
        const argb = fp.fgColor.argb;
        // Exclude white, black, transparent
        if (!['FFFFFFFF', 'FF000000', '00000000', 'FFFDFDFD'].includes(argb)) {
          color = '#' + argb.slice(2); // Drop the alpha prefix → #RRGGBB
        }
      }

      // Fall back to known status colors
      if (!color && STATUS_COLORS[value.trim()]) {
        color = '#' + STATUS_COLORS[value.trim()].slice(2);
      }

      rowData.push({ value, color });
    });

    if (rowNumber === 1) {
      rowData.forEach(c => headers.push(c.value));
    } else {
      rows.push(rowData);
    }
  });

  return { headers, rows };
}
