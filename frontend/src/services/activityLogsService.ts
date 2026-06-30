import axiosInstance from './axiosInstance';

const activityLogsService = {
  getActivityLogs: (params: Record<string, unknown>) => axiosInstance.get('/admin/activity-logs', { params }),
};

export default activityLogsService;
