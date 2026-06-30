import Joi from 'joi';

export const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().min(8).required() });

export const signupSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).*$/).required()
    .messages({ 'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character' }),
  phone: Joi.string().optional(),
  department: Joi.string().optional(),
  designation: Joi.string().optional(),
});

export const forgotPasswordSchema = Joi.object({ email: Joi.string().email().required() });
export const resetPasswordSchema = Joi.object({ token: Joi.string().required(), password: Joi.string().min(8).required() });
export const changePasswordSchema = Joi.object({ currentPassword: Joi.string().required(), newPassword: Joi.string().min(8).required() });

const STATUS_VALUES = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as const;
const PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const HEALTH_VALUES = ['ON_TRACK', 'AT_RISK', 'DELAYED'] as const;

export const createProjectSchema = Joi.object({
  name: Joi.string().required(), clientName: Joi.string().optional(), description: Joi.string().optional(),
  status: Joi.string().valid(...STATUS_VALUES).optional(), priority: Joi.string().valid(...PRIORITY_VALUES).optional(),
  technologies: Joi.array().items(Joi.string()).optional(), tags: Joi.array().items(Joi.string()).optional(),
  startDate: Joi.date().optional(), endDate: Joi.date().optional(), deadline: Joi.date().optional(),
  budget: Joi.number().optional(), teamMemberIds: Joi.array().items(Joi.string()).optional(),
});

export const updateProjectSchema = createProjectSchema.fork(['name'], (s) => s.optional());

export const createWeeklyUpdateSchema = Joi.object({
  weekNumber: Joi.number().required(), year: Joi.number().required(),
  progressSummary: Joi.string().required(),
  completedTasks: Joi.array().items(Joi.string()).optional(),
  plannedTasks: Joi.array().items(Joi.string()).optional(),
  blockers: Joi.string().optional(), milestones: Joi.string().optional(),
  healthStatus: Joi.string().valid(...HEALTH_VALUES).optional(),
  completionPercentage: Joi.number().min(0).max(100).required(),
  hoursLogged: Joi.number().optional(),
});

export const updateWeeklyUpdateSchema = createWeeklyUpdateSchema.fork(
  ['weekNumber', 'year', 'progressSummary', 'completionPercentage'], (s) => s.optional()
);

export const createEditRequestSchema = Joi.object({
  reason: Joi.string().required(), duration: Joi.string().required(), comments: Joi.string().optional(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().optional(), phone: Joi.string().optional(),
  department: Joi.string().optional(), designation: Joi.string().optional(),
  role: Joi.string().valid('ADMIN', 'EMPLOYEE').optional(), isActive: Joi.boolean().optional(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  pageSize: Joi.number().integer().min(1).max(100).default(20).optional(),
});
