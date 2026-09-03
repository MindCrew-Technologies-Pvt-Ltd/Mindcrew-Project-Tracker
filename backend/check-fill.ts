import ExcelJS from 'exceljs';
import fs from 'fs';

async function check() {
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile('test2.xlsx');
  const ws2 = wb2.getWorksheet('Test');
  const cell2 = ws2!.getCell('A1');
  console.log(JSON.stringify(cell2.fill));
}
check().catch(console.error);
