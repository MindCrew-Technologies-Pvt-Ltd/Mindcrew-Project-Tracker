import cron from 'node-cron';
import prisma from '../config/prisma';
import { sendWebPushToMany } from '../services/webPush.service';
import logger from '../config/logger';

/**
 * Daily Timesheet Reminder Cron Job
 * Runs every day at 6:00 PM IST (Asia/Kolkata)
 * Sends a push notification to ALL active EMPLOYEE users (not ADMINs)
 * who have a push subscription registered in the DB.
 */
export function startTimesheetReminderCron(): void {
  cron.schedule(
    '0 18 * * *',   // 18:00 = 6:00 PM every day
    async () => {
      logger.info('[Cron] Running daily timesheet reminder...');
      try {
        const employees = await (prisma.user.findMany as any)({
          where: {
            role: 'EMPLOYEE',
            isActive: true,
            pushSubscription: { not: null },
          },
          select: { id: true, name: true, pushSubscription: true },
        }) as Array<{ id: string; name: string; pushSubscription: string }>;

        if (employees.length === 0) {
          logger.info('[Cron] No employees with push subscriptions found, skipping.');
          return;
        }

        const subscriptions = employees
          .map((e) => e.pushSubscription!)
          .filter(Boolean);

        await sendWebPushToMany(subscriptions, {
          title: '⏰ Timesheet Reminder',
          body: 'Hi! Please fill your timesheet for today before you log off.',
          tag: 'timesheet-reminder',
          url: '/timesheet',
        });

        logger.info(`[Cron] Timesheet reminder sent to ${subscriptions.length} employees.`);
      } catch (err) {
        logger.error('[Cron] Timesheet reminder failed:', err);
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  logger.info('[Cron] Daily timesheet reminder cron scheduled at 6:00 PM IST');
}
