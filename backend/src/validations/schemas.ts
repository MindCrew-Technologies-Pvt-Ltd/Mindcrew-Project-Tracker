import Joi from 'joi';

/**
 * These Joi schemas MUST stay in sync with the frontend Yup schemas in
 * `frontend/src/utils/validators.ts`. Each block below notes its Yup
 * counterpart. If you change a rule on one side, change it on the other.
 */

// Mirrors frontend `passwordRules`: min 8, one capital, one number, one special symbol.
const password = Joi.string()
  .min(8)
  .pattern(/[A-Z]/, 'capital')
  .pattern(/[0-9]/, 'number')
  .pattern(/[^A-Za-z0-9]/, 'special')
  .required()
  .messages({
    'string.min': 'Minimum 8 characters',
    'string.pattern.name': 'Password must contain one capital letter, one number, and one special symbol',
    'any.required': 'Password is required',
  });

// Mirrors frontend `optionalPhone`: optional, but if present must start with a
// country code (+) and contain at least 10 digits.
const optionalPhone = Joi.string()
  .pattern(/^\+(?:[\s-]?\d){10,}$/)
  .allow('', null)
  .optional()
  .messages({ 'string.pattern.base': 'Enter a valid phone with country code, e.g. +91 9876543210' });

// ---- Auth (mirrors loginSchema / signupSchema / forgot / reset / change) ----

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(), // login: presence only, no complexity (matches frontend)
  rememberMe: Joi.boolean().optional(),
});

export const signupSchema = Joi.object({
  name: Joi.string().min(2).required().messages({ 'string.min': 'Name must be at least 2 characters' }),
  email: Joi.string().email().required(),
  phone: optionalPhone,
  department: Joi.string().allow('').optional(),
  designation: Joi.string().allow('').optional(),
  password,
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({ 'any.only': 'Passwords must match', 'any.required': 'Confirm password is required' }),
});

export const forgotPasswordSchema = Joi.object({ email: Joi.string().email().required() });

export const resetPasswordSchema = Joi.object({
  token: Joi.string().length(6).required().messages({ 'string.length': 'OTP must be 6 digits' }),
  password,
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: password,
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({ 'any.only': 'Passwords must match' }),
});

// ---- Projects (mirrors projectSchema) ----

const STATUS_VALUES = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as const;
const PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const HEALTH_VALUES = ['ON_TRACK', 'AT_RISK', 'DELAYED'] as const;

export const createProjectSchema = Joi.object({
  name: Joi.string().min(2).required(),
  clientName: Joi.string().required(),
  clientLocation: Joi.string().allow('').optional(),
  clientWhatsapp: Joi.string().allow('').optional(),
  clientGmail: Joi.string().email().allow('', null).optional().messages({ 'string.email': 'Must be a valid email' }),
  description: Joi.string().allow('').optional(),
  status: Joi.string().valid(...STATUS_VALUES).required(),
  priority: Joi.string().valid(...PRIORITY_VALUES).required(),
  technologies: Joi.array().items(Joi.string()).min(1).required().messages({ 'array.min': 'Select at least one technology' }),
  tags: Joi.array().items(Joi.string()).optional(),
  repositoryUrls: Joi.array().items(Joi.string().allow('')).optional(),
  liveUrls: Joi.array().items(Joi.string().allow('')).optional(),
  videoUrls: Joi.array().items(Joi.string().allow('')).optional(),
  startDate: Joi.date().allow(null, '').optional(),
  endDate: Joi.date().allow(null, '').optional(),
  deadline: Joi.date().allow(null, '').optional(),
  budget: Joi.number().optional(),
  ongoing: Joi.boolean().optional(),
  teamMemberIds: Joi.array().items(Joi.string()).optional(),
});

// Update is a partial: the edit form may submit a subset, so the otherwise
// required fields become optional here.
export const updateProjectSchema = createProjectSchema.fork(
  ['name', 'clientName', 'status', 'priority', 'technologies', 'startDate'],
  (s) => s.optional()
);

// ---- Weekly updates (mirrors weeklyUpdateSchema) ----

export const createWeeklyUpdateSchema = Joi.object({
  weekNumber: Joi.number().min(1).max(53).required(),
  year: Joi.number().min(2020).max(2100).required(),
  progressSummary: Joi.string().min(10).required(),
  completedTasks: Joi.array().items(Joi.string()).optional(),
  plannedTasks: Joi.array().items(Joi.string()).optional(),
  blockers: Joi.string().allow('').optional(),
  milestones: Joi.string().allow('').optional(),
  healthStatus: Joi.string().valid(...HEALTH_VALUES).required(),
  completionPercentage: Joi.number().min(0).max(100).required(),
  hoursLogged: Joi.number().min(0).max(168).optional(),
});

export const updateWeeklyUpdateSchema = createWeeklyUpdateSchema.fork(
  ['weekNumber', 'year', 'progressSummary', 'healthStatus', 'completionPercentage'], (s) => s.optional()
);

// ---- Edit requests (mirrors editRequestSchema) ----

export const createEditRequestSchema = Joi.object({
  reason: Joi.string().min(10).required(),
  comments: Joi.string().allow('').optional(),
});

// ---- Admin: update user (mirrors no dedicated frontend form; kept permissive) ----

// Admin reset of a user's password — same complexity rule as signup/change.
export const adminResetPasswordSchema = Joi.object({
  newPassword: password,
});

export const updateUserSchema = Joi.object({
  name: Joi.string().optional(), phone: Joi.string().allow('').optional(),
  department: Joi.string().allow('').optional(), designation: Joi.string().allow('').optional(),
  role: Joi.string().valid('ADMIN', 'EMPLOYEE').optional(), isActive: Joi.boolean().optional(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  pageSize: Joi.number().integer().min(1).max(100).default(20).optional(),
});

// ---- Timesheet module (mirrors frontend timesheet schemas; see VALIDATION_CONTRACT.md) ----

export const createTimeEntrySchema = Joi.object({
  projectId: Joi.string().required(),
  date: Joi.date().required(),
  hours: Joi.number().integer().min(0).max(24).required(),
  minutes: Joi.number().integer().min(0).max(59).required(),
  description: Joi.string().allow('').optional(),
  billable: Joi.boolean().optional(),
}).custom((v, helpers) => (v.hours * 60 + v.minutes < 1 ? helpers.error('any.invalid') : v))
  .messages({ 'any.invalid': 'Entry must be at least 1 minute' });

export const updateTimeEntrySchema = Joi.object({
  projectId: Joi.string().optional(),
  date: Joi.date().optional(),
  hours: Joi.number().integer().min(0).max(24).optional(),
  minutes: Joi.number().integer().min(0).max(59).optional(),
  description: Joi.string().allow('').optional(),
  billable: Joi.boolean().optional(),
});

export const timerStartSchema = Joi.object({
  projectId: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  billable: Joi.boolean().optional(),
});

export const submitWeekSchema = Joi.object({
  isoYear: Joi.number().integer().min(2020).max(2100).required(),
  isoWeek: Joi.number().integer().min(1).max(53).required(),
});

export const rejectWeekSchema = Joi.object({
  note: Joi.string().min(3).required().messages({ 'string.min': 'A rejection note is required' }),
});

// Admin daily-review action (approve needs no note; reject requires one).
export const reviewWeekSchema = Joi.object({
  userId: Joi.string().required(),
  isoYear: Joi.number().integer().min(2020).max(2100).required(),
  isoWeek: Joi.number().integer().min(1).max(53).required(),
  action: Joi.string().valid('approve', 'reject').required(),
  note: Joi.when('action', {
    is: 'reject',
    then: Joi.string().min(3).required().messages({ 'string.min': 'A rejection note is required' }),
    otherwise: Joi.string().allow('', null).optional(),
  }),
});

export const timesheetSettingsSchema = Joi.object({
  weeklyTargetHours: Joi.number().integer().min(1).max(100).optional(),
  reminderEnabled: Joi.boolean().optional(),
  reminderDay: Joi.number().integer().min(0).max(6).optional(),
  reminderHour: Joi.number().integer().min(0).max(23).optional(),
  timezone: Joi.string().min(3).optional(),
  manualEntryEnabled: Joi.boolean().optional(),
});

export const holidaySchema = Joi.object({
  date: Joi.date().required(),
  name: Joi.string().min(2).required(),
});

export const billableRateSchema = Joi.object({
  hourlyRate: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().optional(),
});

// ---- AI integrations (no Yup mirror: consumed by agents/scripts, not browser forms) ----

export const workLogSchema = Joi.object({
  project: Joi.string().min(1).required(),
  hours: Joi.number().integer().min(0).max(24).required(),
  minutes: Joi.number().integer().min(0).max(59).required(),
  summary: Joi.string().min(3).required(),
  billable: Joi.boolean().optional(),
});
