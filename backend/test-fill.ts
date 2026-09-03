/**
 * Test script to find the correct way to clear cell fill in ExcelJS.
 * We create a workbook with red fill, save it, reload it, try to clear the fill,
 * and verify the result.
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

async function testFillClearing() {
  // Step 1: Create a workbook with red-filled cells
  const wb1 = new ExcelJS.Workbook();
  const ws1 = wb1.addWorksheet('Test');
  
  for (let r = 1; r <= 5; r++) {
    const cell = ws1.getCell(r, 1);
    cell.value = 'A';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
  }
  
  const tmpFile = path.join(__dirname, 'test_fill_clear.xlsx');
  await wb1.xlsx.writeFile(tmpFile);
  console.log('Step 1: Created workbook with red fills');

  // Step 2: Reload and try different clearing methods
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile(tmpFile);
  const ws2 = wb2.getWorksheet('Test')!;
  
  // Method 1: pattern: 'none'
  const c1 = ws2.getCell(1, 1);
  c1.value = 'P';
  c1.fill = { type: 'pattern', pattern: 'none' } as any;
  
  // Method 2: White solid fill
  const c2 = ws2.getCell(2, 1);
  c2.value = 'P';
  c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  
  // Method 3: Create entirely new style object
  const c3 = ws2.getCell(3, 1);
  c3.value = 'P';
  c3.style = { ...c3.style, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } } };
  
  // Method 4: Set fill with no fgColor
  const c4 = ws2.getCell(4, 1);
  c4.value = 'P';
  c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00000000' } };

  // Method 5: Replace entire style
  const c5 = ws2.getCell(5, 1);
  c5.value = 'P';
  c5.style = {};

  const outFile = path.join(__dirname, 'test_fill_result.xlsx');
  await wb2.xlsx.writeFile(outFile);
  console.log('Step 2: Saved with 5 different clearing methods');

  // Step 3: Reload and check
  const wb3 = new ExcelJS.Workbook();
  await wb3.xlsx.readFile(outFile);
  const ws3 = wb3.getWorksheet('Test')!;
  
  for (let r = 1; r <= 5; r++) {
    const cell = ws3.getCell(r, 1);
    console.log(`Method ${r}: value=${cell.value}, fill=${JSON.stringify(cell.fill)}`);
  }
  
  // Cleanup
  fs.unlinkSync(tmpFile);
  fs.unlinkSync(outFile);
}

testFillClearing().catch(console.error);
