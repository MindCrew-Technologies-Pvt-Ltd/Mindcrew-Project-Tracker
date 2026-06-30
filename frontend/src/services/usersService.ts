import axiosInstance from './axiosInstance';
import { UpdateUserPayload } from '../types/user.types';

const usersService = {
  getUsers: (filters: Record<string, unknown>) => axiosInstance.get('/admin/users', { params: filters }),
  getUserById: (id: string) => axiosInstance.get(`/admin/users/${id}`),
  updateUser: (id: string, payload: UpdateUserPayload) => axiosInstance.put(`/admin/users/${id}`, payload),
  deactivateUser: (id: string) => axiosInstance.put(`/admin/users/${id}/deactivate`),
  resetUserPassword: (id: string, newPassword: string) => axiosInstance.put(`/admin/users/${id}/reset-password`, { newPassword }),
};

export default usersService;
