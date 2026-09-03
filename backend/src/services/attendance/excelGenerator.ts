/**
 * Excel workbook generator for attendance data.
 * Port of Python excel_generator.py using ExcelJS.
 */
import ExcelJS from 'exceljs';
import { EmployeeAttendance } from './pdfParser';

// Color definitions matching the Python original
const COLORS = {
  WEEKLY_OFF: 'FFC000',  // Orange/Gold
  ABSENT: 'FF0000',      // Red
  SL: 'FFFF00',          // Yellow
  HD: '92D050',          // Light Green
  WFH: 'CCC0DA',         // Light Purple
  HEADER: 'FCE4D6',      // Light Peach
  NAME_COL: 'F8CBAD',    // Darker Peach
  // Leaves sheet colors
  L_GREY: 'B4C6E7',
  L_ORANGE: 'F4B084',
  L_GREEN: '00B050',
  L_RED: 'FF0000',
};

function fill(color: string): ExcelJS.FillPattern {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' },
};

const centered: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

export const STATUS_FILLS: Record<string, ExcelJS.FillPattern> = {
  'Weekly Off': fill(COLORS.WEEKLY_OFF),
  A: fill(COLORS.ABSENT),
  SL: fill(COLORS.SL),
  HD: fill(COLORS.HD),
  WFH: fill(COLORS.WFH),
};

/**
 * Generate (or update) the master Excel workbook.
 * Returns a Buffer containing the .xlsx bytes.
 */
export async function generateExcel(
  attendanceData: EmployeeAttendance[],
  datesList: Date[],
  existingData?: Buffer | null
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  if (existingData) {
    await wb.xlsx.load(existingData as any);
  }

  // Sheet names
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const mainTitle = `${monthNames[datesList[0].getMonth()]} ${datesList[0].getFullYear()}`;
  const leavesTitle = `${monthNames[datesList[0].getMonth()].substring(0, mainTitle.split(' ')[0].length)} leaves ${datesList[0].getFullYear()}`;

  // Remove existing sheets with same name
  const existingMain = wb.getWorksheet(mainTitle);
  if (existingMain) wb.removeWorksheet(existingMain.id);
  const existingLeaves = wb.getWorksheet(leavesTitle);
  if (existingLeaves) wb.removeWorksheet(existingLeaves.id);

  // Remove default "Sheet" if other sheets exist
  const defaultSheet = wb.getWorksheet('Sheet');
  if (defaultSheet && wb.worksheets.length > 0) {
    wb.removeWorksheet(defaultSheet.id);
  }

  const ws = wb.addWorksheet(mainTitle);
  const wsLeaves = wb.addWorksheet(leavesTitle);

  // ── Attendance Sheet ──────────────────────────────────────────────

  // Row 1 + Row 2 headers
  const headerStyle = { fill: fill(COLORS.HEADER), font: { bold: true }, alignment: centered, border: thinBorder };

  ws.getCell(1, 1).value = ''; ws.getCell(1, 1).style = headerStyle as any;
  ws.getCell(2, 1).value = 'Name'; ws.getCell(2, 1).style = headerStyle as any;
  ws.getCell(1, 2).value = ''; ws.getCell(1, 2).style = headerStyle as any;
  ws.getCell(2, 2).value = 'Employee ID'; ws.getCell(2, 2).style = headerStyle as any;

  // Day/Date headers
  for (let i = 0; i < datesList.length; i++) {
    const col = i + 3;
    const d = datesList[i];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStr = dayNames[d.getDay()];
    const dateStr = `${String(d.getDate()).padStart(2, '0')}-${monthNames[d.getMonth()].substring(0, 3)}`;

    ws.getCell(1, col).value = dayStr;
    ws.getCell(1, col).style = headerStyle as any;
    ws.getCell(2, col).value = dateStr;
    ws.getCell(2, col).style = headerStyle as any;
  }

  // Sort by numeric employee ID
  attendanceData.sort((a, b) => {
    const na = parseInt((a.emp_id.match(/\d+/) || ['0'])[0], 10);
    const nb = parseInt((b.emp_id.match(/\d+/) || ['0'])[0], 10);
    return na - nb;
  });

  // Data rows
  let currentRow = 3;
  for (const emp of attendanceData) {
    const nameCell = ws.getCell(currentRow, 1);
    nameCell.value = emp.emp_name;
    nameCell.style = { fill: fill(COLORS.NAME_COL), alignment: centered, border: thinBorder } as any;

    const idCell = ws.getCell(currentRow, 2);
    idCell.value = emp.emp_id;
    idCell.style = { fill: fill(COLORS.NAME_COL), alignment: centered, border: thinBorder } as any;

    for (let i = 0; i < datesList.length; i++) {
      const col = i + 3;
      const dayNum = i + 1;
      const att = emp.attendance[dayNum];
      const status = att?.final_status || '';

      const cell = ws.getCell(currentRow, col);
      cell.value = status;
      cell.alignment = centered as any;
      cell.border = thinBorder as any;
      if (STATUS_FILLS[status]) cell.fill = STATUS_FILLS[status];
    }

    currentRow++;
  }

  // Column widths
  ws.getColumn(1).width = 25;
  ws.getColumn(2).width = 15;
  for (let i = 0; i < datesList.length; i++) {
    ws.getColumn(i + 3).width = 12;
  }

  // ── Leaves Sheet ──────────────────────────────────────────────────

  const leavesHeaders: Array<{ text: string; color: string; width: number }> = [
    { text: 'Name', color: COLORS.L_GREY, width: 25 },
    { text: 'Leaves Carried Forward', color: COLORS.L_ORANGE, width: 15 },
    { text: 'Available Leaves', color: COLORS.L_GREEN, width: 15 },
    { text: 'Last month Comp Off Balance', color: COLORS.L_GREEN, width: 18 },
    { text: 'Current Month CompOff', color: COLORS.L_GREEN, width: 18 },
    { text: 'Short Leaves', color: COLORS.L_RED, width: 15 },
    { text: 'Total Casual Leaves Availed', color: COLORS.L_RED, width: 18 },
    { text: 'Total Leave Balance', color: COLORS.L_GREEN, width: 15 },
    { text: 'Total Comp off Balance', color: COLORS.L_GREEN, width: 18 },
    { text: 'Subtracting leave from Comp off', color: COLORS.L_GREEN, width: 18 },
    { text: 'H2-G2 Leave Balance', color: COLORS.L_ORANGE, width: 15 },
    { text: 'Compoff Bal', color: COLORS.L_ORANGE, width: 15 },
    { text: 'LWP', color: COLORS.L_RED, width: 12 },
  ];

  for (let ci = 0; ci < leavesHeaders.length; ci++) {
    const h = leavesHeaders[ci];
    const cell = wsLeaves.getCell(1, ci + 1);
    cell.value = h.text;
    cell.style = {
      fill: fill(h.color),
      font: { bold: true },
      alignment: { ...centered, wrapText: true },
      border: thinBorder,
    } as any;
    wsLeaves.getColumn(ci + 1).width = h.width;
  }

  // Leaves data with formulas (matching Python exactly)
  // Helper to get Excel column letter from number
  function getColLetter(col: number): string {
    let letter = '';
    while (col > 0) {
      const rem = (col - 1) % 26;
      letter = String.fromCharCode(65 + rem) + letter;
      col = Math.floor((col - 1) / 26);
    }
    return letter;
  }
  const lastMainCol = getColLetter(datesList.length + 2);
  const mainS = `'${mainTitle}'`;

  for (let idx = 0; idx < attendanceData.length; idx++) {
    const r = idx + 2; // leaves sheet row (header=1, data starts at 2)
    const mainR = idx + 3; // main sheet data row (starts at 3)
    const rangeStr = `${mainS}!C${mainR}:${lastMainCol}${mainR}`;

    // A: Name (formula referencing main sheet)
    wsLeaves.getCell(r, 1).value = { formula: `=${mainS}!A${mainR}` } as any;
    // B: Leaves Carried Forward
    wsLeaves.getCell(r, 2).value = 0;
    // C: Available Leaves
    wsLeaves.getCell(r, 3).value = 1.5;
    // D: Last month Comp Off Balance
    wsLeaves.getCell(r, 4).value = 0;
    // E: Current Month CompOff
    wsLeaves.getCell(r, 5).value = 0;
    // F: Short Leaves
    wsLeaves.getCell(r, 6).value = { formula: `=MIN(COUNTIF(${rangeStr}, "SL"), 3)` } as any;
    // G: Total Casual Leaves Availed
    wsLeaves.getCell(r, 7).value = {
      formula: `=COUNTIF(${rangeStr}, "A") + COUNTIF(${rangeStr}, "HD")*0.5 + MAX(0, COUNTIF(${rangeStr}, "SL") - 3)*0.5`,
    } as any;
    // H: Total Leave Balance
    wsLeaves.getCell(r, 8).value = { formula: `=B${r}+C${r}` } as any;
    // I: Total Comp off Balance
    wsLeaves.getCell(r, 9).value = { formula: `=D${r}+E${r}` } as any;
    // J: Subtracting leave from Comp off
    wsLeaves.getCell(r, 10).value = 0;
    // K: H2-G2 Leave Balance
    wsLeaves.getCell(r, 11).value = { formula: `=H${r}-G${r}` } as any;
    // L: Compoff Bal
    wsLeaves.getCell(r, 12).value = { formula: `=I${r}-J${r}` } as any;
    // M: LWP
    wsLeaves.getCell(r, 13).value = 0;

    // Style all cells
    for (let ci = 1; ci <= 13; ci++) {
      const cell = wsLeaves.getCell(r, ci);
      cell.alignment = centered as any;
      cell.border = thinBorder as any;
      if (ci === 1) cell.fill = fill(COLORS.L_GREY);
    }
  }

  // Write to buffer
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
