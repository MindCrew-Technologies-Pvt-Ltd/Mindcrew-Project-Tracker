import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const UPLOADS_DIR = process.env.RAILWAY_ENVIRONMENT ? '/data/uploads/attendance' : path.join(__dirname, 'uploads', 'attendance');
const MASTER_FILE = path.join(UPLOADS_DIR, 'Attendance_Master.xlsx');

async function fixColors() {
  if (!fs.existsSync(MASTER_FILE)) {
    console.log('No master file found at', MASTER_FILE);
    return;
  }

  console.log('Fixing colors in', MASTER_FILE);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(MASTER_FILE);

  const statusColors: Record<string, string> = {
    'Weekly Off': 'FFC000', A: 'FF0000', SL: 'FFFF00', HD: '92D050', WFH: 'CCC0DA',
  };

  wb.eachSheet((ws, id) => {
    const isLeaves = ws.name.includes(' leaves ');
    if (isLeaves) return;

    for (let r = 3; r <= ws.rowCount; r++) {
      for (let c = 3; c <= ws.columnCount; c++) {
        const cell = ws.getCell(r, c);
        const val = cell.value ? String(cell.value) : '';
        
        if (statusColors[val]) {
          cell.fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: `FF${statusColors[val]}` },
          };
        } else {
          delete cell.style.fill;
          cell.fill = undefined as any;
        }
      }
    }
  });

  await wb.xlsx.writeFile(MASTER_FILE);
  console.log('Master file colors fixed!');
}

fixColors().catch(console.error);
