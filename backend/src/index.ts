import 'dotenv/config';
import { execSync } from 'child_process';
import app from './app';
import { PORT } from './config/env';
import { startCronJobs } from './cron/weeklyReminder';
import logger from './config/logger';
import prisma from './config/prisma';

process.on('uncaughtException', (err) => { logger.error('Uncaught Exception:', err); process.exit(1); });
process.on('unhandledRejection', (reason) => { logger.error('Unhandled Rejection:', reason); process.exit(1); });

/**
 * Keep the database schema in sync with prisma/schema.prisma on every boot, so a
 * schema change can never leave the deployed backend querying columns that don't
 * exist. Runs only in the compiled (production) build — local ts-node-dev is
 * skipped so file-watch respawns aren't slowed down. Set DISABLE_AUTO_DB_PUSH=1
 * to opt out. Additive changes apply automatically; a destructive change makes
 * `db push` fail non-interactively, which fails startup loudly instead of
 * silently dropping data.
 */
function syncDatabaseSchema(): void {
  const isCompiled = __filename.endsWith('.js');
  if (!isCompiled || process.env.DISABLE_AUTO_DB_PUSH) return;
  logger.info('Syncing database schema (prisma db push)...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  logger.info('Database schema in sync');
}

async function main() {
  syncDatabaseSchema();
  await prisma.$connect();
  logger.info('Database connected');
  app.listen(PORT, () => logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`));
  startCronJobs();
}

main().catch((err) => { logger.error('Failed to start:', err); process.exit(1); });
