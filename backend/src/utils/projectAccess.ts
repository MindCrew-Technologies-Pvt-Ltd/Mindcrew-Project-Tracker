import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * Throws 404 unless the user may access the given project. A non-admin may only
 * access a project they own or are a team member of. We return 404 (not 403) so
 * the response doesn't reveal that a project with this id exists.
 *
 * Use this in every project-scoped read/write (project detail, weekly updates,
 * documents, ...) so employees can never see another team's data by guessing an id.
 */
export async function assertProjectAccess(
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
  if (!isAdmin && !isOwner && !isMember) throw new AppError('Project not found', 404);
}
