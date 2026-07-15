import axiosInstance from './axiosInstance';

const editRequestsService = {
  getEditRequests: (filters: Record<string, unknown>) => axiosInstance.get('/admin/edit-requests', { params: filters }),
  approveEditRequest: (id: string) => axiosInstance.put(`/admin/edit-requests/${id}/approve`),
  rejectEditRequest: (id: string, reason: string) => axiosInstance.put(`/admin/edit-requests/${id}/reject`, { reason }),
  revokeEditRequest: (id: string) => axiosInstance.put(`/edit-requests/${id}/revoke`),
};

export default editRequestsService;
