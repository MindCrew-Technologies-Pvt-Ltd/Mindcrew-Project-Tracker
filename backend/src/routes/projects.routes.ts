import { Router } from 'express';
import { getProjects, getProject, createProject, updateProject, deleteProject, archiveProject, addTeamMember, removeTeamMember, requestEditAccess } from '../controllers/projects.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProjectSchema, updateProjectSchema, createEditRequestSchema } from '../validations/schemas';

const router = Router();

router.get('/', authenticate, getProjects);
router.post('/', authenticate, validate(createProjectSchema), createProject);
router.get('/:id', authenticate, getProject);
router.put('/:id', authenticate, validate(updateProjectSchema), updateProject);
router.delete('/:id', authenticate, requireAdmin, deleteProject);
router.put('/:id/archive', authenticate, requireAdmin, archiveProject);
router.post('/:id/team', authenticate, addTeamMember);
router.delete('/:id/team/:userId', authenticate, removeTeamMember);
router.post('/:id/edit-request', authenticate, validate(createEditRequestSchema), requestEditAccess);

export default router;
