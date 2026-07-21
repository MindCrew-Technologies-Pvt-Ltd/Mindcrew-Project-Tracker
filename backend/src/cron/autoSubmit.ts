import cron from 'node-cron';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { submitWeekForUser } from '../controllers/timesheets.controller';
import { isoWeekOf, todayInOrgTz } from '../utils/isoWeek';
import { orgTimezone } from '../utils/timesheetAccess';

/**
 * Daily-lock model backstop: every Monday 00:10 org time, the just-ended week
 * is auto-submitted for everyone who logged time but didn't press Submit.
 * Rejected weeks are skipped (they need manual fixes + resubmission).
 */
export async function autoSubmitLastWeek(): Promise<{ submitted: number; skipped: number }> {
  const tz = await orgTimezone();
  const today = todayInOrgTz(tz);
  const lastWeekDay = new Date(today);
  lastWeekDay.setUTCDate(today.getUTCDate() - 7);
  const { isoYear, isoWeek } = isoWeekOf(lastWeekDay);

  const authors = await prisma.timeEntry.findMany({
    where: { isoYear, isoWeek },
    select: { userId: true },
    distinct: ['userId'],
  });

  let submitted = 0;
  let skipped = 0;
  for (const { userId } of authors) {
    try {
      await submitWeekForUser(userId, isoYear, isoWeek, { auto: true });
      submitted += 1;
    } catch {
      skipped += 1; // already submitted/approved, or rejected awaiting fixes
    }
  }
  logger.info(`Auto-submit W${isoWeek}/${isoYear}: ${submitted} submitted, ${skipped} skipped`);
  return { submitted, skipped };
}

export function startAutoSubmitJob(): void {
  // Monday 00:10 in the org timezone (settings tz is read per run for the
  // week computation; the schedule anchor uses the default org zone).
  cron.schedule('10 0 * * 1', () => {
    autoSubmitLastWeek().catch((err) => logger.error('Auto-submit failed:', err));
  }, { timezone: 'Asia/Kolkata' });
  logger.info('Auto-submit job scheduled (Mon 00:10 Asia/Kolkata)');
}
