import 'dotenv/config';
import app from './app';
import { PORT } from './config/env';
import { startCronJobs } from './cron/weeklyReminder';
import logger from './config/logger';
import prisma from './config/prisma';

process.on('uncaughtException', (err) => { logger.error('Uncaught Exception:', err); process.exit(1); });
process.on('unhandledRejection', (reason) => { logger.error('Unhandled Rejection:', reason); process.exit(1); });

async function main() {
  await prisma.$connect();
  logger.info('Database connected');
  app.listen(PORT, () => logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`));
  startCronJobs();
}

main().catch((err) => { logger.error('Failed to start:', err); process.exit(1); });
