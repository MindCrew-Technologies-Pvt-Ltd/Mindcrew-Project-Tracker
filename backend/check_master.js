const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function checkMaster() {
  const masterPath = path.join(__dirname, 'Mindcrew_Attendance_Master.xlsx');
  if (!fs.existsSync(masterPath)) {
    console.log('Master file not found');
    return;
  }
  
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(masterPath);
  
  const ws = wb.getWorksheet('September 2026');
  if (!ws) {
    console.log('September 2026 sheet not found');
    return;
  }
  
  let targetRow = -1;
  for (let r = 3; r <= ws.rowCount; r++) {
    const name = ws.getCell(r, 1).value;
    if (name === 'Anurag Kadam') {
      targetRow = r;
      break;
    }
  }
  
  if (targetRow === -1) {
    console.log('Anurag Kadam not found');
    return;
  }
  
  console.log(`Anurag Kadam is on row ${targetRow}`);
  for (let c = 3; c <= 9; c++) {
    const cell = ws.getCell(targetRow, c);
    console.log(`Col ${c}: value=${JSON.stringify(cell.value)}, type=${cell.type}, fill=${JSON.stringify(cell.fill)}`);
  }
}

checkMaster().catch(console.error);
