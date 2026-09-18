const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.timesheetSettings.findUnique({where: {id: 'singleton'}}).then(console.log).finally(() => p.$disconnect());
