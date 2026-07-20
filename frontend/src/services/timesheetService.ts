import axiosInstance from './axiosInstance';
import {
  CreateTimeEntryPayload, UpdateTimeEntryPayload, CopyWeekPayload, SummaryFilters, ProjectRef,
} from '../types/timesheet.types';

const timesheetService = {
  // ---- Time entries ----
  getWeek: (isoYear: number, isoWeek: number, userId?: string) =>
    axiosInstance.get('/time-entries/week', { params: { isoYear, isoWeek, ...(userId ? { userId } : {}) } }),
  getEntries: (params: { from?: string; to?: string; projectId?: string; userId?: string }) =>
    axiosInstance.get('/time-entries', { params }),
  createEntry: (payload: CreateTimeEntryPayload) => axiosInstance.post('/time-entries', payload),
  updateEntry: (id: string, payload: UpdateTimeEntryPayload) => axiosInstance.put(`/time-entries/${id}`, payload),
  deleteEntry: (id: string) => axiosInstance.delete(`/time-entries/${id}`),
  copyWeek: (payload: CopyWeekPayload) => axiosInstance.post('/time-entries/copy-week', payload),

  // ---- Timer ----
  getTimer: () => axiosInstance.get('/timer'),
  startTimer: (payload: { projectId: string; description?: string; billable?: boolean }) =>
    axiosInstance.post('/timer/start', payload),
  pauseTimer: () => axiosInstance.post('/timer/pause'),
  resumeTimer: () => axiosInstance.post('/timer/resume'),
  stopTimer: () => axiosInstance.post('/timer/stop'),
  discardTimer: () => axiosInstance.delete('/timer'),

  // ---- Submission & approvals ----
  submitWeek: (isoYear: number, isoWeek: number) => axiosInstance.post('/timesheets/submit', { isoYear, isoWeek }),
  myWeeks: (year?: number) => axiosInstance.get('/timesheets/mine', { params: year ? { year } : {} }),
  pending: (params: { status?: string; page?: number; pageSize?: number }) =>
    axiosInstance.get('/timesheets/pending', { params }),
  missing: (isoYear: number, isoWeek: number) => axiosInstance.get('/timesheets/missing', { params: { isoYear, isoWeek } }),
  weekDetail: (id: string) => axiosInstance.get(`/timesheets/${id}`),
  approve: (id: string) => axiosInstance.put(`/timesheets/${id}/approve`),
  reject: (id: string, note: string) => axiosInstance.put(`/timesheets/${id}/reject`, { note }),
  reopen: (id: string) => axiosInstance.put(`/timesheets/${id}/reopen`),

  // ---- Reports ----
  summary: (params: SummaryFilters) => axiosInstance.get('/reports/time/summary', { params }),
  utilization: (from: string, to: string) => axiosInstance.get('/reports/time/utilization', { params: { from, to } }),
  exportCsv: (params: SummaryFilters) =>
    axiosInstance.get('/reports/time/export', { params: { ...params, format: 'csv' }, responseType: 'blob' }),

  // ---- Admin configuration ----
  getSettings: () => axiosInstance.get('/timesheet-settings'),
  updateSettings: (payload: { weeklyTargetHours?: number; reminderEnabled?: boolean; reminderDay?: number; reminderHour?: number }) =>
    axiosInstance.put('/timesheet-settings', payload),
  listHolidays: () => axiosInstance.get('/holidays'),
  addHoliday: (payload: { date: string; name: string }) => axiosInstance.post('/holidays', payload),
  deleteHoliday: (id: string) => axiosInstance.delete(`/holidays/${id}`),
  listRates: () => axiosInstance.get('/billable-rates'),
  setRate: (userId: string, payload: { hourlyRate: number; currency?: string }) =>
    axiosInstance.put(`/billable-rates/${userId}`, payload),

  /** Lightweight project options for pickers: my projects first, fall back to all. */
  getProjectOptions: async (): Promise<ProjectRef[]> => {
    const toRefs = (list: Array<{ id: string; name: string }>): ProjectRef[] =>
      (list || []).map((p) => ({ id: p.id, name: p.name }));
    const mine = await axiosInstance.get('/projects', { params: { scope: 'mine', pageSize: 100 } });
    const mineRefs = toRefs(mine.data?.data || []);
    if (mineRefs.length > 0) return mineRefs;
    const all = await axiosInstance.get('/projects', { params: { pageSize: 100 } });
    return toRefs(all.data?.data || []);
  },
};

export default timesheetService;
