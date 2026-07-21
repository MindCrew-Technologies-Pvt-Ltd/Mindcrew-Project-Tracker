export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type TimeEntrySource = 'MANUAL' | 'TIMER' | 'COPY' | 'AI_AGENT';

export interface ProjectRef { id: string; name: string; }
export interface UserRef { id: string; name: string; email?: string; }

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  /** UTC date-only, serialized ISO (e.g. "2026-07-13T00:00:00.000Z") */
  date: string;
  minutes: number;
  description?: string | null;
  billable: boolean;
  isoYear: number;
  isoWeek: number;
  source: TimeEntrySource;
  createdAt: string;
  updatedAt: string;
  project: ProjectRef;
  /** Present on project-scoped listings (the project Timesheet tab). */
  user?: UserRef;
}

/** GET /time-entries/project/:projectId */
export interface ProjectTimePayload {
  entries: TimeEntry[];
  totalMinutes: number;
  billableMinutes: number;
  /** 'all' for admin/owner/team members; 'own' for everyone else. */
  scope: 'all' | 'own';
}

export interface TimesheetWeek {
  id: string;
  userId: string;
  isoYear: number;
  isoWeek: number;
  status: TimesheetStatus;
  totalMinutes: number;
  submittedAt?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  reviewedBy?: UserRef | null;
  user?: UserRef;
  createdAt?: string;
  updatedAt?: string;
}

/** Row shape of GET /timesheets/pending (envelope enriched for the queue table). */
export interface PendingWeekRow extends TimesheetWeek {
  entryCount: number;
  billableMinutes: number;
  projects: ProjectRef[];
  label: string;
}

/** GET /timesheets/:id — envelope + its entries grouped client-side by day. */
export interface WeekDetail extends TimesheetWeek {
  entries: TimeEntry[];
  dates: string[];
  label: string;
}

export interface Holiday { id: string; date: string; name: string; }

/** GET /time-entries/week */
export interface WeekGridPayload {
  entries: TimeEntry[];
  week: TimesheetWeek | null;
  dates: string[];
  holidays: Holiday[];
  /** "Today" in the ORG timezone — the only editable day (daily-lock rule). */
  today: string;
  /** False = AI-only mode: no manual add/edit/delete/timer/submit (admins always true). */
  manualEntryEnabled: boolean;
}

export interface ActiveTimer {
  id: string;
  userId: string;
  projectId: string;
  description?: string | null;
  billable: boolean;
  startedAt: string;
  accumulatedMin: number;
  isPaused: boolean;
  elapsedMinutes: number;
  project: ProjectRef;
}

export interface TimesheetSettings {
  id: string;
  weeklyTargetHours: number;
  reminderEnabled: boolean;
  reminderDay: number;
  reminderHour: number;
  timezone: string;
  manualEntryEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTimeEntryPayload {
  projectId: string;
  date: string;
  hours: number;
  minutes: number;
  description?: string;
  billable?: boolean;
}

export type UpdateTimeEntryPayload = Partial<CreateTimeEntryPayload>;

export type SummaryGroupBy = 'user' | 'project' | 'day';

export interface SummaryRow {
  key: string;
  label: string;
  minutes: number;
  billableMinutes: number;
  entryCount: number;
}

export interface SummaryTotals { minutes: number; billableMinutes: number; entryCount: number; }

export interface TimeSummary {
  rows: SummaryRow[];
  totals: SummaryTotals;
  groupBy: SummaryGroupBy;
  from: string;
  to: string;
}

export interface UtilizationRow {
  userId: string;
  name: string;
  email: string;
  minutes: number;
  billableMinutes: number;
  targetMinutes: number;
  utilizationPct: number;
  overtimeMinutes: number;
  cost?: number;
  currency?: string;
}

export interface UtilizationReport {
  rows: UtilizationRow[];
  targetMinutes: number;
  weeks: number;
  from: string;
  to: string;
}

export interface MissingUser { id: string; name: string; email: string; }

export interface BillableRate {
  id?: string;
  userId?: string;
  hourlyRate: number;
  currency: string;
}

/** Row shape of GET /billable-rates */
export interface RateUser {
  id: string;
  name: string;
  email: string;
  billableRate: BillableRate | null;
}

export interface SummaryFilters {
  from: string;
  to: string;
  groupBy: SummaryGroupBy;
  projectId?: string;
  userId?: string;
  billable?: 'true' | 'false';
}
