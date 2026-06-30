export type HealthStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'COMPLETED';

export interface WeeklyUpdate {
  id: string;
  projectId: string;
  weekNumber: number;
  year: number;
  progressSummary: string;
  completedTasks: string[];
  plannedTasks: string[];
  blockers?: string;
  milestones?: string;
  healthStatus: HealthStatus;
  completionPercentage: number;
  hoursLogged?: number;
  attachments: string[];
  author: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateWeeklyUpdatePayload {
  weekNumber: number;
  year: number;
  progressSummary: string;
  completedTasks: string[];
  plannedTasks: string[];
  blockers?: string;
  milestones?: string;
  healthStatus: HealthStatus;
  completionPercentage: number;
  hoursLogged?: number;
}
