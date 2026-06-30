import axiosInstance from './axiosInstance';
import { ReportType, ReportFilters } from '../types/report.types';

const TYPE_MAP: Record<ReportType, string> = {
  PROJECT: 'projects',
  WEEKLY_UPDATE: 'weekly_updates',
  TECHNOLOGY_USAGE: 'tech_usage',
  COMPLETED_PROJECTS: 'completed',
  DELAYED_PROJECTS: 'delayed',
};

const reportsService = {
  getReport: (type: ReportType, filters: ReportFilters) =>
    axiosInstance.post('/admin/reports/generate', { type: TYPE_MAP[type], ...filters }),
  exportReport: (type: ReportType, filters: ReportFilters) =>
    axiosInstance.post('/admin/reports/export', { type: TYPE_MAP[type], ...filters }, { responseType: 'blob' }),
};

export default reportsService;
