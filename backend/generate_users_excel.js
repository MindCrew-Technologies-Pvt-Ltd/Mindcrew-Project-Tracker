/**
 * Generate a text/CSV file with all Users & their Reporting Managers.
 *
 * HOW TO RUN (from backend/ folder):
 *   $env:DATABASE_URL="paste-your-railway-DATABASE_URL-here"
 *   node ..\scratch\generate_users_excel.js
 *
 * OUTPUT: Users_Reporting_Managers.xlsx  (Excel)
 *       + Users_Reporting_Managers.csv   (CSV - opens in Excel too)
 *       + Users_Reporting_Managers.txt   (plain text table)
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

let ExcelJS;
try { ExcelJS = require('exceljs'); } catch { ExcelJS = null; }

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('📡 Fetching users from database...');
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        name: true, email: true, phone: true, department: true,
        designation: true, employeeId: true, jobRoles: true,
        managerEmployeeIds: true, role: true, isActive: true, createdAt: true,
      },
    });
    console.log(`   Found ${users.length} users`);

    const empIdToName = new Map();
    users.forEach(u => { if (u.employeeId) empIdToName.set(u.employeeId, u.name); });

    const rows = users.map((u, i) => {
      const mgr = (u.managerEmployeeIds || []).map(id => empIdToName.get(id)).filter(Boolean).join(', ');
      return {
        sno: i + 1,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        empId: u.employeeId || '',
        department: u.department || '',
        designation: u.designation || '',
        jobRoles: (u.jobRoles || []).join(', '),
        role: u.role,
        status: u.isActive ? 'Active' : 'Inactive',
        reportingManager: mgr || 'Not Assigned',
        joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      };
    });

    const outDir = path.resolve(__dirname, '..');

    // --- CSV ---
    const csvHeader = 'S.No,Employee Name,Email,Phone,Employee ID,Department,Designation,Job Roles,Role,Status,Reporting Manager,Joined';
    const csvRows = rows.map(r =>
      `${r.sno},"${r.name}","${r.email}","${r.phone}","${r.empId}","${r.department}","${r.designation}","${r.jobRoles}","${r.role}","${r.status}","${r.reportingManager}","${r.joined}"`
    );
    const csvPath = path.join(outDir, 'Users_Reporting_Managers.csv');
    fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join('\n'), 'utf8');
    console.log(`✅ CSV:   ${csvPath}`);

    // --- TXT (formatted table) ---
    const pad = (s, w) => String(s).padEnd(w).slice(0, w);
    const cols = [
      ['#', 4], ['Name', 24], ['Email', 30], ['Department', 16], ['Designation', 20],
      ['Role', 10], ['Status', 8], ['Reporting Manager', 28], ['Joined', 14],
    ];
    const sep = cols.map(([, w]) => '-'.repeat(w)).join('-+-');
    const hdr = cols.map(([h, w]) => pad(h, w)).join(' | ');
    const txtRows = rows.map(r =>
      [pad(r.sno, 4), pad(r.name, 24), pad(r.email, 30), pad(r.department, 16),
       pad(r.designation, 20), pad(r.role, 10), pad(r.status, 8),
       pad(r.reportingManager, 28), pad(r.joined, 14)].join(' | ')
    );
    const txtPath = path.join(outDir, 'Users_Reporting_Managers.txt');
    fs.writeFileSync(txtPath, ['USERS & REPORTING MANAGERS', `Generated: ${new Date().toLocaleString('en-IN')}`, `Total: ${users.length} users`, '', hdr, sep, ...txtRows, ''].join('\n'), 'utf8');
    console.log(`✅ TXT:   ${txtPath}`);

    // --- XLSX (if exceljs available) ---
    if (ExcelJS) {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MindCrew Project Tracker';
      const sheet = workbook.addWorksheet('Users & Reporting Managers', { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.columns = [
        { header: 'S.No', key: 'sno', width: 6 }, { header: 'Employee Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 32 }, { header: 'Phone', key: 'phone', width: 16 },
        { header: 'Employee ID', key: 'empId', width: 14 }, { header: 'Department', key: 'department', width: 18 },
        { header: 'Designation', key: 'designation', width: 22 }, { header: 'Job Roles', key: 'jobRoles', width: 22 },
        { header: 'Role', key: 'role', width: 12 }, { header: 'Status', key: 'status', width: 10 },
        { header: 'Reporting Manager', key: 'reportingManager', width: 30 }, { header: 'Joined', key: 'joined', width: 14 },
      ];
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;
      rows.forEach((r, i) => {
        const row = sheet.addRow(r);
        if (i % 2 === 1) row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } }; });
        const rm = row.getCell('reportingManager');
        rm.font = r.reportingManager !== 'Not Assigned' ? { bold: true, color: { argb: 'FF4F46E5' } } : { italic: true, color: { argb: 'FF94A3B8' } };
        row.getCell('status').font = { bold: true, color: { argb: r.status === 'Active' ? 'FF15803D' : 'FFB91C1C' } };
      });
      sheet.autoFilter = { from: 'A1', to: 'L1' };
      const xlsxPath = path.join(outDir, 'Users_Reporting_Managers.xlsx');
      await workbook.xlsx.writeFile(xlsxPath);
      console.log(`✅ Excel: ${xlsxPath}`);
    }

    console.log(`\n🎉 Done! ${users.length} users exported.`);
  } finally { await prisma.$disconnect(); }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
