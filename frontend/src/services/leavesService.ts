import axiosInstance from './axiosInstance';
import { CreateLeaveRequestPayload, UpdateLeaveStatusPayload } from '../types/leave.types';

const leavesService = {
  createRequest: (payload: CreateLeaveRequestPayload) => 
    axiosInstance.post('/leaves', payload),
    
  getMyRequests: () => 
    axiosInstance.get('/leaves/my-requests'),
    
  getTeamRequests: () => 
    axiosInstance.get('/leaves/team-requests'),
    
  updateStatus: (id: string, payload: UpdateLeaveStatusPayload) => 
    axiosInstance.put(`/leaves/${id}/status`, payload),

  getMyManagers: () => 
    axiosInstance.get('/users/my-managers'),

  cancelRequest: (id: string) =>
    axiosInstance.post(`/leaves/${id}/cancel-request`),

  reviewCancelRequest: (id: string, payload: { approved: boolean }) =>
    axiosInstance.post(`/leaves/${id}/cancel-review`, payload),
};

export default leavesService;
