import cron from 'node-cron';
import prisma from '../config/prisma';
import { createNotification } from '../utils/notifications';
import { todayInOrgTz } from '../utils/isoWeek';
import logger from '../config/logger';

/**
 * Daily timesheet reminder (in-app notification, no email): at the configured
 * hour (TimesheetSettings.reminderHour, org timezone) every active non-admin
 * user with NO time logged today is nudged to tell their AI assistant
 * "fill my timesheet" before the 11:59 PM daily lock. Holidays are skipped.
 * Runs hourly and compares against the setting, so the hour is configurable
 * without re-scheduling.
 */
export function startDailyReminderJob(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      const settings = await prisma.timesheetSettings.findUnique({ where: { id: 'singleton' } });
      if (!settings?.reminderEnabled) return;
      const tz = settings.timezone || 'Asia/Kolkata';
      const hourNow = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date()));
      if (hourNow !== settings.reminderHour) return;

      const today = todayInOrgTz(tz);
      const holiday = await prisma.holiday.findUnique({ where: { date: today } });
      if (holiday) return;

      const users = await prisma.user.findMany({
        where: { isActive: true, role: { not: 'ADMIN' } },
        select: { id: true },
      });
      const logged = await prisma.timeEntry.findMany({
        where: { date: today }, select: { userId: true }, distinct: ['userId'],
      });
      const loggedSet = new Set(logged.map((l) => l.userId));
      const missing = users.filter((u) => !loggedSet.has(u.id));

      await Promise.all(missing.map((u) => createNotification({
        userId: u.id,
        title: 'Timesheet reminder',
        message: 'You haven\'t logged any time today — ask your AI assistant to "fill my timesheet" before the day locks at 11:59 PM.',
        type: 'TIMESHEET',
      })));
      if (missing.length > 0) logger.info(`Daily timesheet reminder sent to ${missing.length} user(s)`);
    } catch (err) {
      logger.error('Daily timesheet reminder failed:', err);
    }
  });
  logger.info('Cron registered: daily timesheet reminder (hourly check against TimesheetSettings)');
}
