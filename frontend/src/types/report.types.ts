export type ReportType = 'PROJECT' | 'WEEKLY_UPDATE' | 'TECHNOLOGY_USAGE' | 'COMPLETED_PROJECTS' | 'DELAYED_PROJECTS';
export type ExportFormat = 'xlsx' | 'pdf' | 'csv';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  technology?: string;
  employeeId?: string;
}
