import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * Visibility model (per SRS): every authenticated user may VIEW every project,
 * its weekly updates and documents. WRITING is restricted to the project owner,
 * its team members, or an admin — others must go through an approved edit request.
 */

/** Throws 404 if the project doesn't exist. Use on read paths. */
export async function assertProjectExists(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) throw new AppError('Project not found', 404);
}

/**
 * Throws 404 if the project doesn't exist, 403 unless the user is an admin,
 * the owner, or a team member. Use on write paths (create update, upload doc, ...).
 */
export async function assertProjectWriteAccess(
  projectId: string,
  user: { id: string; role?: string },
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, teamMembers: { select: { userId: true } } },
  });
  if (!project) throw new AppError('Project not found', 404);

  const isAdmin = user.role === 'ADMIN';
  const isOwner = project.ownerId === user.id;
  const isMember = project.teamMembers.some((m) => m.userId === user.id);
  if (!isAdmin && !isOwner && !isMember) throw new AppError('No permission to modify this project', 403);
}
