import cron from 'node-cron';
import prisma from '../config/prisma';
import { createNotification } from '../utils/notifications';
import { sendEmail } from '../config/nodemailer';
import logger from '../config/logger';

function getWeekNumber(date: Date): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { weekNumber, year: d.getUTCFullYear() };
}

export function startCronJobs(): void {
  cron.schedule('0 9 * * 5', async () => {
    logger.info('Weekly reminder cron started');
    try {
      const activeProjects = await prisma.project.findMany({
        where: { status: 'ACTIVE' },
        include: { owner: true, teamMembers: { include: { user: true } } },
      });
      const { weekNumber, year } = getWeekNumber(new Date());
      for (const project of activeProjects) {
        try {
          const existing = await prisma.weeklyUpdate.findFirst({ where: { projectId: project.id, weekNumber, year } });
          if (existing) continue;
          const seen = new Set<string>();
          const users = [project.owner, ...project.teamMembers.map((m) => m.user)].filter((u) => {
            if (!u || seen.has(u.id)) return false;
            seen.add(u.id); return true;
          });
          for (const user of users) {
            await createNotification({ userId: user.id, title: 'Weekly Update Reminder', message: `Please submit your weekly update for "${project.name}"`, type: 'WEEKLY_UPDATE_REMINDER', projectId: project.id });
            await sendEmail(user.email, `Weekly Update Reminder: ${project.name}`, `<p>Hi ${user.name},</p><p>Please submit the weekly update for <strong>${project.name}</strong> (Week ${weekNumber}, ${year}).</p>`);
          }
        } catch (err) {
          logger.error(`Reminder error for project ${project.id}:`, err);
        }
      }
      logger.info('Weekly reminder cron completed');
    } catch (err) {
      logger.error('Weekly reminder cron failed:', err);
    }
  });
  logger.info('Cron jobs registered: weekly reminder every Friday 9AM');
}
