import { RequestHandler } from 'express';
import prisma from '../config/prisma';
import { success, error } from '../utils/response';
import { logActivity } from '../utils/activityLogger';

type ReportType = 'projects' | 'weekly_updates' | 'tech_usage' | 'completed' | 'delayed';

async function buildData(type: ReportType, startDate?: string, endDate?: string): Promise<unknown[]> {
  const dateFilter = (startDate || endDate) ? { createdAt: { ...(startDate && { gte: new Date(startDate) }), ...(endDate && { lte: new Date(endDate) }) } } : {};

  switch (type) {
    case 'projects': {
      const rows = await prisma.project.findMany({ where: dateFilter, include: { _count: { select: { teamMembers: true, weeklyUpdates: true } } }, orderBy: { createdAt: 'desc' } });
      return rows.map((p) => ({ id: p.id, name: p.name, status: p.status, priority: p.priority, technologies: p.technologies, createdAt: p.createdAt, memberCount: p._count.teamMembers, updateCount: p._count.weeklyUpdates }));
    }
    case 'weekly_updates':
      return prisma.weeklyUpdate.findMany({ where: dateFilter, include: { author: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } });
    case 'tech_usage': {
      const rows = await prisma.project.findMany({ select: { technologies: true } });
      const counts: Record<string, number> = {};
      for (const r of rows) for (const t of r.technologies) counts[t] = (counts[t] ?? 0) + 1;
      return Object.entries(counts).map(([technology, count]) => ({ technology, count })).sort((a, b) => b.count - a.count);
    }
    case 'completed': {
      const where: Record<string, unknown> = { status: 'COMPLETED' };
      if (startDate || endDate) where.updatedAt = { ...(startDate && { gte: new Date(startDate) }), ...(endDate && { lte: new Date(endDate) }) };
      return prisma.project.findMany({ where, orderBy: { updatedAt: 'desc' } });
    }
    case 'delayed': {
      const rows = await prisma.project.findMany({ where: { deadline: { lt: new Date() }, status: { notIn: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] } }, orderBy: { deadline: 'asc' } });
      return rows.map((p) => ({ ...p, daysOverdue: Math.ceil((Date.now() - new Date(p.deadline!).getTime()) / 86400000) }));
    }
  }
}

function toCsv(data: unknown[]): string {
  if (!data.length) return '';
  const headers = Object.keys(data[0] as object);
  const rows = data.map((row) => headers.map((h) => {
    const v = (row as Record<string, unknown>)[h];
    let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    // Neutralize spreadsheet formula injection: a user-supplied value starting
    // with = + - @ would execute as a formula when the CSV is opened in Excel.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export const generateReport: RequestHandler = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.body;
    const valid: ReportType[] = ['projects', 'weekly_updates', 'tech_usage', 'completed', 'delayed'];
    if (!valid.includes(type)) { error(res, `Invalid type. Must be one of: ${valid.join(', ')}`, 400); return; }
    const data = await buildData(type, startDate, endDate);
    await logActivity({ userId: req.user!.id, action: 'GENERATE', module: 'REPORT', description: `Generated ${type} report` });
    success(res, { type, count: data.length, data });
  } catch (err) { next(err); }
};

export const getEmployeeAnalytics: RequestHandler = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Fetch all active users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        employeeId: true,
        department: true,
        designation: true,
      }
    });

    // 2. Fetch project assignments (ACTIVE projects only)
    const members = await prisma.projectMember.findMany({
      where: { project: { status: 'ACTIVE' } },
      select: { userId: true, project: { select: { name: true } } }
    });
    
    // Group projects by user
    const userProjects = members.reduce((acc, m) => {
      if (!acc[m.userId]) acc[m.userId] = [];
      acc[m.userId].push(m.project.name);
      return acc;
    }, {} as Record<string, string[]>);

    // 3. Fetch today's approved leaves/WFH
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart }
      }
    });

    // 4. Fetch today's daily availability
    const availabilities = await prisma.dailyAvailability.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd }
      }
    });

    // 5. Fetch today's time entries (using date field)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd }
      }
    });
    
    // Group time logged by user
    const userMinutes = timeEntries.reduce((acc, te) => {
      acc[te.userId] = (acc[te.userId] || 0) + te.minutes;
      return acc;
    }, {} as Record<string, number>);

    // Combine data
    const analytics = users.map(user => {
      const activeProjects = userProjects[user.id] || [];
      const userLeaves = leaves.filter(l => l.userId === user.id);
      
      let leaveType = null;
      if (userLeaves.length > 0) {
        leaveType = userLeaves[0].type; // 'FULL_DAY', 'HALF_DAY', 'WFH'
      }

      const availability = availabilities.find(a => a.userId === user.id);
      const minutesLogged = userMinutes[user.id] || 0;
      
      return {
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation,
        activeProjects,
        leaveType,
        availabilityStatus: availability?.status || 'NOT_UPDATED',
        availabilityNote: availability?.note || null,
        minutesLogged,
      };
    });

    success(res, analytics);
  } catch (err) { next(err); }
};

export const exportReport: RequestHandler = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.body;
    const valid: ReportType[] = ['projects', 'weekly_updates', 'tech_usage', 'completed', 'delayed'];
    if (!valid.includes(type)) { error(res, `Invalid type`, 400); return; }
    const data = await buildData(type, startDate, endDate);
    await logActivity({ userId: req.user!.id, action: 'EXPORT', module: 'REPORT', description: `Exported ${type} report as CSV` });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${type}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(toCsv(data));
  } catch (err) { next(err); }
};
