import cron from 'node-cron';
import prisma from '../config/prisma';
import { sendWebPushToMany } from '../services/webPush.service';
import logger from '../config/logger';
import { createNotification } from '../utils/notifications';

/**
 * Daily Timesheet Reminder Cron Job
 * Runs every day at 5:00 PM, 6:00 PM, and 7:00 PM IST (Asia/Kolkata)
 * Sends a push notification to ALL active EMPLOYEE users (not ADMINs)
 * who have a push subscription registered in the DB.
 */
export const startTimesheetReminderCron = () => {
  // We use Node-cron to schedule it
  cron.schedule(
    '0 17,18,19 * * *',   // 17:00, 18:00, 19:00 every day
    async () => {
      logger.info('[Cron] Running daily timesheet reminder...');
      try {
        const employees = await (prisma.user.findMany as any)({
          where: {
            role: 'EMPLOYEE',
            isActive: true,
          },
          select: { id: true, name: true, pushSubscription: true },
        }) as Array<{ id: string; name: string; pushSubscription: string | null }>;

        if (employees.length === 0) {
          logger.info('[Cron] No active employees found, skipping.');
          return;
        }

        const subscriptions = employees
          .map((e) => e.pushSubscription!)
          .filter(Boolean);

        if (subscriptions.length > 0) {
          await sendWebPushToMany(subscriptions, {
            title: '⏰ Timesheet Reminder',
            body: 'Hi! Please fill your timesheet for today before you log off.',
            tag: 'timesheet-reminder',
            url: '/timesheet',
          });
        }

        await Promise.all(employees.map(e => createNotification({
          userId: e.id,
          title: '⏰ Timesheet Reminder',
          message: 'Hi! Please fill your timesheet for today before you log off.',
          type: 'TIMESHEET'
        })));

        logger.info(`[Cron] Timesheet reminder sent to ${employees.length} employees (push sent to ${subscriptions.length}).`);
      } catch (err) {
        logger.error('[Cron] Timesheet reminder failed:', err);
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  logger.info('[Cron] Daily timesheet reminder cron scheduled at 5, 6, 7 PM IST');
}
