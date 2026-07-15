import { RequestHandler } from 'express';
import { Prisma, ProjectStatus, Priority } from '@prisma/client';
import prisma from '../config/prisma';
import { success, paginated, error } from '../utils/response';
import { logActivity } from '../utils/activityLogger';
import { createNotification } from '../utils/notifications';
import { getPaginationParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

const sp = (v: string | string[]): string => Array.isArray(v) ? v[0]! : v;
const qs = (v: unknown): string | undefined => (v && typeof v === 'string' ? v : undefined);

export const getProjects: RequestHandler = async (req, res, next) => {
  try {
    const { skip, take, page, pageSize } = getPaginationParams(req.query as Record<string, unknown>);
    const search = qs(req.query.search);
    const status = qs(req.query.status);
    const priority = qs(req.query.priority);
    const technology = qs(req.query.technology);
    const tags = qs(req.query.tags);
    const startDate = qs(req.query.startDate);
    const endDate = qs(req.query.endDate);
    const scope = qs(req.query.scope);

    const andClauses: Prisma.ProjectWhereInput[] = [];
    if (search) andClauses.push({ OR: [{ name: { contains: search, mode: 'insensitive' } }, { clientName: { contains: search, mode: 'insensitive' } }] });
    if (status) andClauses.push({ status: status as ProjectStatus });
    if (priority) andClauses.push({ priority: priority as Priority });
    if (technology) andClauses.push({ technologies: { has: technology } });
    if (tags) andClauses.push({ tags: { hasSome: tags.split(',').map((t) => t.trim()) } });
    if (startDate) andClauses.push({ startDate: { gte: new Date(startDate) } });
    if (endDate) andClauses.push({ endDate: { lte: new Date(endDate) } });
    // Everyone may see every project (per SRS). `scope=mine` narrows to projects
    // the user owns or is a team member of (used by the dashboard and "My Projects").
    if (scope === 'mine') andClauses.push({ OR: [{ ownerId: req.user!.id }, { teamMembers: { some: { userId: req.user!.id } } }] });

    const where: Prisma.ProjectWhereInput = andClauses.length ? { AND: andClauses } : {};
    const [items, total] = await Promise.all([
      prisma.project.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { owner: { select: { id: true, name: true, email: true } }, _count: { select: { teamMembers: true, weeklyUpdates: true } } } }),
      prisma.project.count({ where }),
    ]);
    paginated(res, items, total, page, pageSize);
  } catch (err) { next(err); }
};

export const getProject: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const project = await prisma.project.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } }, teamMembers: { include: { user: { select: { id: true, name: true, email: true } } } }, weeklyUpdates: { orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { documents: true, editRequests: true } } },
    });
    if (!project) return next(new AppError('Project not found', 404));

    // Every authenticated user may view any project (per SRS); editing is
    // still restricted to owner/team/admin or an approved edit request.
    success(res, project);
  } catch (err) { next(err); }
};

export const createProject: RequestHandler = async (req, res, next) => {
  try {
    const { name, clientName, clientLocation, clientWhatsapp, clientGmail, description, status, priority, technologies, tags, repositoryUrls, liveUrls, startDate, endDate, deadline, budget, teamMemberIds } = req.body;
    const project = await prisma.project.create({
      data: { name, clientName, clientLocation, clientWhatsapp, clientGmail, description, status, priority, technologies: technologies ?? [], tags: tags ?? [], repositoryUrls: repositoryUrls ?? [], liveUrls: liveUrls ?? [], startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, deadline: deadline ? new Date(deadline) : undefined, budget, ownerId: req.user!.id, teamMembers: Array.isArray(teamMemberIds) && teamMemberIds.length ? { create: teamMemberIds.map((uid: string) => ({ userId: uid })) } : undefined },
      include: { owner: { select: { id: true, name: true, email: true } }, teamMembers: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    await logActivity({ userId: req.user!.id, action: 'CREATE', module: 'PROJECT', description: `Created project "${project.name}"` });
    success(res, project, 'Project created', 201);
  } catch (err) { next(err); }
};

export const updateProject: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Project not found', 404));
    const isAdmin = req.user?.role === 'ADMIN';
    const isOwner = existing.ownerId === req.user!.id;
    if (!isAdmin && !isOwner) {
      // An approved edit request grants permanent edit access (no expiry).
      const approved = await prisma.editRequest.findFirst({ where: { projectId: id, requestedById: req.user!.id, status: 'APPROVED' } });
      if (!approved) return next(new AppError('No permission to update this project', 403));
    }
    const { name, clientName, clientLocation, clientWhatsapp, clientGmail, description, status, priority, technologies, tags, repositoryUrls, liveUrls, startDate, endDate, deadline, budget } = req.body;
    const updated = await prisma.project.update({
      where: { id },
      data: { ...(name !== undefined && { name }), ...(clientName !== undefined && { clientName }), ...(clientLocation !== undefined && { clientLocation }), ...(clientWhatsapp !== undefined && { clientWhatsapp }), ...(clientGmail !== undefined && { clientGmail }), ...(description !== undefined && { description }), ...(status !== undefined && { status }), ...(priority !== undefined && { priority }), ...(technologies !== undefined && { technologies }), ...(tags !== undefined && { tags }), ...(repositoryUrls !== undefined && { repositoryUrls }), ...(liveUrls !== undefined && { liveUrls }), ...(startDate ? { startDate: new Date(startDate) } : {}), ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }), ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }), ...(budget !== undefined && { budget }) },
      include: { owner: { select: { id: true, name: true, email: true } }, teamMembers: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    await logActivity({ userId: req.user!.id, action: 'UPDATE', module: 'PROJECT', description: `Updated project "${updated.name}"` });
    success(res, updated);
  } catch (err) { next(err); }
};

export const deleteProject: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Project not found', 404));
    // An admin, or the project's own owner, may delete it.
    if (req.user?.role !== 'ADMIN' && existing.ownerId !== req.user!.id) return next(new AppError('You can only delete your own projects', 403));
    await prisma.project.delete({ where: { id } });
    await logActivity({ userId: req.user!.id, action: 'DELETE', module: 'PROJECT', description: `Deleted project "${existing.name}"` });
    success(res, null, 'Project deleted');
  } catch (err) { next(err); }
};

export const archiveProject: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return next(new AppError('Project not found', 404));
    const updated = await prisma.project.update({ where: { id }, data: { status: 'ARCHIVED' } });
    await logActivity({ userId: req.user!.id, action: 'ARCHIVE', module: 'PROJECT', description: `Archived project "${existing.name}"` });
    success(res, updated);
  } catch (err) { next(err); }
};

// Active users that can be assigned to a project team (any authenticated user
// may read this minimal list so a project owner can build their team).
export const getAssignableUsers: RequestHandler = async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    success(res, users);
  } catch (err) { next(err); }
};

export const addTeamMember: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const { userId, role } = req.body;
    if (!userId) { error(res, 'userId is required', 400); return; }
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return next(new AppError('Project not found', 404));
    if (req.user?.role !== 'ADMIN' && project.ownerId !== req.user!.id) return next(new AppError('Forbidden', 403));
    if (userId === project.ownerId) { error(res, 'The project owner is already on the team', 400); return; }
    const existing = await prisma.projectMember.findFirst({ where: { projectId: id, userId } });
    if (existing) { error(res, 'This user is already a team member', 400); return; }
    const member = await prisma.projectMember.create({ data: { projectId: id, userId, role: role ?? 'MEMBER' }, include: { user: { select: { id: true, name: true, email: true } } } });
    await logActivity({ userId: req.user!.id, action: 'ADD_MEMBER', module: 'PROJECT', description: `Added ${member.user.name} to "${project.name}"` });
    success(res, member, 'Member added', 201);
  } catch (err) { next(err); }
};

export const removeTeamMember: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const userId = sp(req.params.userId);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return next(new AppError('Project not found', 404));
    if (req.user?.role !== 'ADMIN' && project.ownerId !== req.user!.id) return next(new AppError('Forbidden', 403));
    const member = await prisma.projectMember.findFirst({ where: { projectId: id, userId } });
    if (!member) return next(new AppError('Member not found', 404));
    await prisma.projectMember.delete({ where: { id: member.id } });
    success(res, null, 'Member removed');
  } catch (err) { next(err); }
};

export const requestEditAccess: RequestHandler = async (req, res, next) => {
  try {
    const id = sp(req.params.id);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return next(new AppError('Project not found', 404));
    if (project.ownerId === req.user!.id) { error(res, 'You already own this project', 400); return; }
    const pending = await prisma.editRequest.findFirst({ where: { projectId: id, requestedById: req.user!.id, status: 'PENDING' } });
    if (pending) { error(res, 'You already have a pending request', 409); return; }
    // Requesting is one-time: with access already granted there is nothing to ask for.
    // (A REJECTED or REVOKED user may request again.)
    const approved = await prisma.editRequest.findFirst({ where: { projectId: id, requestedById: req.user!.id, status: 'APPROVED' } });
    if (approved) { error(res, 'You already have edit access to this project', 409); return; }
    const { reason, comments } = req.body;
    const editRequest = await prisma.editRequest.create({ data: { projectId: id, requestedById: req.user!.id, reason, comments } });
    const requester = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
    await createNotification({ userId: project.ownerId, title: 'Edit Access Request', message: `${requester?.name ?? 'A user'} requested edit access to "${project.name}". Review it on the project's Edit Requests tab.`, type: 'EDIT_REQUEST_UPDATE', projectId: project.id, relatedId: editRequest.id });
    success(res, editRequest, 'Request submitted', 201);
  } catch (err) { next(err); }
};
