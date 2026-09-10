const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'backend/src/utils/timesheetAccess.ts',
  'backend/src/routes/attendance.routes.ts',
  'backend/src/middleware/auth.ts',
  'backend/src/controllers/timesheets.controller.ts',
  'backend/src/controllers/projects.controller.ts',
  'backend/src/controllers/leaves.controller.ts'
];

filesToUpdate.forEach(file => {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace .some(r => r.toLowerCase() === 'admin')
  content = content.replace(/\.some\(\s*\(?r(?:\s*:\s*string)?\)?\s*=>\s*r\.toLowerCase\(\)\s*===\s*'admin'\s*\)/g, ".includes('Admin')");
  
  // Replace .some(r => r.toUpperCase() === 'ADMIN')
  content = content.replace(/\.some\(\s*r\s*=>\s*r\.toUpperCase\(\)\s*===\s*'ADMIN'\s*\)/g, ".includes('Admin')");

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Updated ' + file);
});
