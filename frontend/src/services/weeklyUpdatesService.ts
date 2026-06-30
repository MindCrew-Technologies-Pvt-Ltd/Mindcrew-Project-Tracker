import axiosInstance from './axiosInstance';
import { CreateWeeklyUpdatePayload } from '../types/weeklyUpdate.types';

const weeklyUpdatesService = {
  getWeeklyUpdates: (projectId: string) => axiosInstance.get(`/projects/${projectId}/weekly-updates`),
  createWeeklyUpdate: (projectId: string, payload: CreateWeeklyUpdatePayload) => axiosInstance.post(`/projects/${projectId}/weekly-updates`, payload),
  updateWeeklyUpdate: (_projectId: string, updateId: string, payload: Partial<CreateWeeklyUpdatePayload>) => axiosInstance.put(`/weekly-updates/${updateId}`, payload),
  deleteWeeklyUpdate: (_projectId: string, updateId: string) => axiosInstance.delete(`/weekly-updates/${updateId}`),
};

export default weeklyUpdatesService;
