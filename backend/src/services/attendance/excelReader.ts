/**
 * Excel reader — reads sheet names and cell data from the master workbook.
 * Port of Python excel_reader.py using ExcelJS.
 */
import ExcelJS from 'exceljs';

export interface SheetData {
  headers: string[];
  rows: string[][];
  is_leaves: boolean;
  sheet_name: string;
}

/** Get all sheet names from the workbook (excluding default "Sheet"). */
export async function getAvailableSheets(data: Buffer): Promise<string[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as any);
  return wb.worksheets
    .map((ws) => ws.name)
    .filter((n) => n !== 'Sheet');
}

/** Helper: count statuses in an attendance row (columns 3+). */
function countStatus(ws: ExcelJS.Worksheet, row: number, status: string): number {
  let count = 0;
  const maxCol = ws.columnCount;
  for (let col = 3; col <= maxCol; col++) {
    if (ws.getCell(row, col).value === status) count++;
  }
  return count;
}

function numVal(cell: ExcelJS.Cell): number {
  const v = cell.value;
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    if (v.startsWith('=')) return 0; // formula not evaluated
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  // formula result object
  if (typeof v === 'object' && 'result' in v) {
    const r = (v as any).result;
    return typeof r === 'number' ? r : 0;
  }
  return 0;
}

function cellStr(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    return v === Math.floor(v) ? String(v) : String(v);
  }
  if (typeof v === 'string') return v;
  // formula object
  if (typeof v === 'object' && 'result' in v) {
    const r = (v as any).result;
    if (r === null || r === undefined) return '';
    return String(r);
  }
  if (typeof v === 'object' && 'formula' in v) {
    return ''; // formula without cached result
  }
  return String(v);
}

function fmt(n: number): string {
  if (n === Math.floor(n)) return String(Math.floor(n));
  return String(n);
}

/**
 * Read data from any sheet (attendance or leaves).
 */
export async function readSheetData(
  data: Buffer,
  sheetName: string
): Promise<SheetData | null> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as any);

  const ws = wb.getWorksheet(sheetName);
  if (!ws) return null;

  const isLeaves = sheetName.includes(' leaves ');
  const headers: string[] = [];

  if (isLeaves) {
    // Header row = 1
    for (let col = 1; col <= ws.columnCount; col++) {
      const val = ws.getCell(1, col).value;
      if (val) headers.push(String(val));
    }
  } else {
    // Header row = 2 (row 1 is day names)
    headers.push('Name', 'Employee ID');
    for (let col = 3; col <= ws.columnCount; col++) {
      const val = ws.getCell(2, col).value;
      if (val) headers.push(String(val));
    }
  }

  const rows: string[][] = [];

  if (isLeaves) {
    // Find the corresponding attendance sheet
    const parts = sheetName.split(' leaves ');
    const attSheetName = parts.length === 2 ? `${parts[0]} ${parts[1]}` : null;
    const attWs = attSheetName ? wb.getWorksheet(attSheetName) : null;

    const dataStartRow = 2;
    for (let r = dataStartRow; r <= ws.rowCount; r++) {
      const cellA = ws.getCell(r, 1).value;
      if (!cellA) continue;

      // Get actual name from attendance sheet
      const attRow = r + 1; // leaves row 2 = attendance row 3
      let name = '';
      if (attWs) {
        const nameVal = attWs.getCell(attRow, 1).value;
        name = nameVal ? String(nameVal) : '';
      } else {
        name = cellStr(ws.getCell(r, 1));
      }

      // Read editable values
      const bVal = numVal(ws.getCell(r, 2)); // Leaves Carried Forward
      const cVal = numVal(ws.getCell(r, 3)); // Available Leaves
      const dVal = numVal(ws.getCell(r, 4)); // Last month Comp Off Balance
      const eVal = numVal(ws.getCell(r, 5)); // Current Month CompOff
      const jVal = numVal(ws.getCell(r, 10)); // Subtracting leave from Comp off
      const mVal = numVal(ws.getCell(r, 13)); // LWP

      // Compute formula columns from attendance data
      let fVal = 0, gVal = 0, hVal = 0, iVal = 0, kVal = 0, lVal = 0;
      if (attWs) {
        const countA = countStatus(attWs, attRow, 'A');
        const countHD = countStatus(attWs, attRow, 'HD');
        const countSL = countStatus(attWs, attRow, 'SL');

        fVal = Math.min(countSL, 3);
        gVal = countA + countHD * 0.5 + Math.max(0, countSL - 3) * 0.5;
        hVal = bVal + cVal;
        iVal = dVal + eVal;
        kVal = hVal - gVal;
        lVal = iVal - jVal;
      }

      rows.push([
        name, fmt(bVal), fmt(cVal), fmt(dVal), fmt(eVal),
        fmt(fVal), fmt(gVal), fmt(hVal), fmt(iVal),
        fmt(jVal), fmt(kVal), fmt(lVal), fmt(mVal),
      ]);
    }
  } else {
    // Attendance sheet — straightforward read
    const dataStartRow = 3;
    for (let r = dataStartRow; r <= ws.rowCount; r++) {
      const name = ws.getCell(r, 1).value;
      if (!name) continue;

      const row: string[] = [];
      for (let col = 1; col <= headers.length; col++) {
        row.push(cellStr(ws.getCell(r, col)));
      }
      rows.push(row);
    }
  }

  return { headers, rows, is_leaves: isLeaves, sheet_name: sheetName };
}

/**
 * Save edits back to a sheet in the master workbook. Returns updated workbook bytes.
 */
export async function saveSheetData(
  data: Buffer,
  sheetName: string,
  headers: string[],
  rowsData: string[][]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as any);

  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error('Sheet not found');

  const isLeaves = sheetName.includes(' leaves ');
  const dataStartRow = isLeaves ? 2 : 3;

  for (let ri = 0; ri < rowsData.length; ri++) {
    const excelRow = dataStartRow + ri;

    for (let ci = 0; ci < rowsData[ri].length; ci++) {
      const excelCol = ci + 1;
      const cellValue = rowsData[ri][ci];

      // Skip formula cells
      const existing = ws.getCell(excelRow, excelCol).value;
      if (typeof existing === 'string' && existing.startsWith('=')) continue;
      if (typeof existing === 'object' && existing !== null && 'formula' in existing) continue;

      // Convert numeric strings for leaves
      let writeValue: string | number = cellValue;
      if (isLeaves) {
        const num = parseFloat(cellValue);
        if (!isNaN(num)) {
          writeValue = num === Math.floor(num) ? Math.floor(num) : num;
        }
      }

      ws.getCell(excelRow, excelCol).value = writeValue;

      // Apply attendance colors
      if (!isLeaves && excelCol >= 3) {
        const cell = ws.getCell(excelRow, excelCol);
        
        const statusColors: Record<string, string> = {
          'Weekly Off': 'FFC000', A: 'FF0000', SL: 'FFFF00', HD: '92D050', WFH: 'CCC0DA',
        };
        
        // ExcelJS bug: pattern:'none' does NOT clear fill.
        // Only resetting entire style works. So we reset and re-apply borders/alignment.
        const border: Partial<ExcelJS.Borders> = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
        const alignment: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };
        
        if (statusColors[cellValue]) {
          cell.style = {
            border,
            alignment,
            fill: {
              type: 'pattern', pattern: 'solid',
              fgColor: { argb: `FF${statusColors[cellValue]}` },
            },
          };
        } else {
          // P or empty — clear fill entirely
          cell.style = { border, alignment };
        }
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
