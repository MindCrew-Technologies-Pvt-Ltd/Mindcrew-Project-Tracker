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
};

export default leavesService;
