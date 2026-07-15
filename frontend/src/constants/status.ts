import { ProjectStatus, ProjectPriority } from '../types/project.types';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ARCHIVED: 'Archived',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'primary',
  CANCELLED: 'error',
  ARCHIVED: 'secondary',
};

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_COLORS: Record<ProjectPriority, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  LOW: 'info',
  MEDIUM: 'warning',
  HIGH: 'error',
  CRITICAL: 'error',
};

export const TECHNOLOGY_OPTIONS = [
  // Mobile
  'Android', 'iOS', 'Flutter', 'React Native', 'Swift', 'SwiftUI', 'Kotlin', 'Dart',
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'PHP', 'Go', 'Rust', 'C++',
  // Frontend
  'React', 'Next.js', 'Vue.js', 'Angular', 'Tailwind CSS', 'HTML/CSS',
  // Backend
  'Node.js', 'Express', 'NestJS', 'Django', 'FastAPI', 'Flask', 'Laravel', 'Spring Boot', '.NET', 'Ruby on Rails', 'GraphQL',
  // Databases & BaaS
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase', 'Firebase', 'SQLite', 'Prisma',
  // Cloud & DevOps
  'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Railway', 'Vercel',
  // CMS & other
  'WordPress', 'Shopify', 'Unity', 'Electron',
];

export const TAG_OPTIONS = [
  'Healthcare', 'E-commerce', 'AI', 'CRM', 'Internal', 'Mobile App',
  'Web App', 'API', 'Dashboard', 'Analytics', 'Finance', 'Education',
];

export const DOCUMENT_CATEGORY_LABELS = {
  PROPOSAL: 'Proposal',
  SRS: 'SRS',
  DESIGN: 'Design',
  MEETING_NOTES: 'Meeting Notes',
  CONTRACT: 'Contract',
  DELIVERY_FILES: 'Delivery Files',
  SCREENSHOTS: 'Screenshots',
  OTHER: 'Other',
};
