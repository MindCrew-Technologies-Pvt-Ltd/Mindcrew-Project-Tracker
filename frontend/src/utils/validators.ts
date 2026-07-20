import * as yup from 'yup';

const passwordRules = yup.string()
  .min(8, 'Minimum 8 characters')
  .matches(/[A-Z]/, 'Must contain one capital letter')
  .matches(/[0-9]/, 'Must contain one number')
  .matches(/[^A-Za-z0-9]/, 'Must contain one special symbol')
  .required('Password is required');

export const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
  rememberMe: yup.boolean(),
});

const optionalPhone = yup.string()
  .transform((value, original) => (original === '' ? undefined : value))
  .test('phone-format', 'Enter a valid phone with country code, e.g. +91 9876543210', (value) => {
    if (!value) return true; // optional — empty is fine
    if (!value.trim().startsWith('+')) return false; // must include country code
    const digits = value.replace(/\D/g, '').length;
    return digits >= 10 && digits <= 15; // between 10 and 15 digits (E.164 max)
  })
  .optional();

export const signupSchema = yup.object({
  name: yup.string().min(2, 'Name must be at least 2 characters').required('Full name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: optionalPhone,
  department: yup.string().optional(),
  designation: yup.string().optional(),
  password: passwordRules,
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Confirm password is required'),
});

export const forgotPasswordSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
});

export const resetPasswordSchema = yup.object({
  otp: yup.string().length(6, 'OTP must be 6 digits').required('OTP is required'),
  newPassword: passwordRules,
  confirmPassword: yup.string().oneOf([yup.ref('newPassword')], 'Passwords must match').required('Confirm password is required'),
});

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: passwordRules,
  confirmPassword: yup.string().oneOf([yup.ref('newPassword')], 'Passwords must match').required('Confirm password is required'),
});

export const projectSchema = yup.object({
  name: yup.string().min(2).required('Project name is required'),
  clientName: yup.string().required('Client name is required'),
  clientLocation: yup.string().optional(),
  clientWhatsapp: yup.string().optional(),
  clientGmail: yup.string().email('Must be a valid email').nullable().optional(),
  description: yup.string().optional(),
  startDate: yup.string().nullable().optional(),
  endDate: yup.string().nullable().optional(),
  status: yup.string().required('Status is required'),
  priority: yup.string().required('Priority is required'),
  technologies: yup.array().of(yup.string()).min(1, 'Select at least one technology').required(),
  tags: yup.array().of(yup.string()),
});

export const weeklyUpdateSchema = yup.object({
  weekNumber: yup.number().min(1).max(53).required('Week number is required'),
  year: yup.number().min(2020).max(2100).required('Year is required'),
  progressSummary: yup.string().min(10).required('Progress summary is required'),
  completedTasks: yup.array().of(yup.string()).required(),
  plannedTasks: yup.array().of(yup.string()).required(),
  blockers: yup.string().optional(),
  milestones: yup.string().optional(),
  healthStatus: yup.string().required('Health status is required'),
  completionPercentage: yup.number().min(0).max(100).required('Completion percentage is required'),
  hoursLogged: yup.number().min(0).max(168).optional(),
});

export const editRequestSchema = yup.object({
  reason: yup.string().min(10).required('Reason is required'),
  comments: yup.string().optional(),
});

// Mirrors backend `createTimeEntrySchema` (Joi): projectId + date required,
// hours 0-24 int, minutes 0-59 int, and at least 1 minute in total.
export const timeEntrySchema = yup.object({
  projectId: yup.string().required('Project is required'),
  date: yup.string().required('Date is required'),
  hours: yup.number().typeError('Hours must be a number').integer('Whole hours only').min(0).max(24).required('Hours are required'),
  minutes: yup.number().typeError('Minutes must be a number').integer('Whole minutes only').min(0).max(59).required('Minutes are required'),
  description: yup.string().optional(),
  billable: yup.boolean().optional(),
}).test('at-least-one-minute', 'Entry must be at least 1 minute', (v) =>
  ((v?.hours ?? 0) * 60 + (v?.minutes ?? 0)) >= 1);
