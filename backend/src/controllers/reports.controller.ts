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
