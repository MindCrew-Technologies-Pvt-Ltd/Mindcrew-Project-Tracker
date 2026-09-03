import ExcelJS from 'exceljs';
import fs from 'fs';

async function test() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Test');
  
  const cell = ws.getCell('A1');
  cell.value = 'A';
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
  
  await wb.xlsx.writeFile('test.xlsx');
  
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile('test.xlsx');
  const ws2 = wb2.getWorksheet('Test');
  const cell2 = ws2!.getCell('A1');
  
  cell2.value = 'P';
  
  // Try clearing fill
  cell2.fill = { type: 'pattern', pattern: 'none' };
  
  await wb2.xlsx.writeFile('test2.xlsx');
  console.log('done');
}
test().catch(console.error);
