// Promote an existing user to ADMIN. Run from the backend service console:
//   node scripts/promote-admin.js user@email.com
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/promote-admin.js <email>');
  process.exit(1);
}
p.user
  .update({ where: { email }, data: { role: 'ADMIN' } })
  .then((u) => console.log('PROMOTED:', u.email, '->', u.role))
  .catch((e) => {
    console.error('FAILED:', e.code === 'P2025' ? `No user with email ${email}` : e.message);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
