import axiosInstance from './axiosInstance';
import { ProjectFilters, CreateProjectPayload } from '../types/project.types';
import { CreateEditRequestPayload } from '../types/editRequest.types';

const projectsService = {
  getProjects: (filters: ProjectFilters) => axiosInstance.get('/projects', { params: filters }),
  getProjectById: (id: string) => axiosInstance.get(`/projects/${id}`),
  createProject: (payload: CreateProjectPayload) => axiosInstance.post('/projects', payload),
  updateProject: (id: string, payload: Partial<CreateProjectPayload>) => axiosInstance.put(`/projects/${id}`, payload),
  deleteProject: (id: string) => axiosInstance.delete(`/projects/${id}`),
  archiveProject: (id: string) => axiosInstance.put(`/projects/${id}/archive`),
  requestEditAccess: (id: string, payload: CreateEditRequestPayload) => axiosInstance.post(`/projects/${id}/edit-request`, payload),
  getAssignableUsers: () => axiosInstance.get('/projects/lookup/users'),
  addTeamMember: (id: string, userId: string, role: string) => axiosInstance.post(`/projects/${id}/team`, { userId, role }),
  removeTeamMember: (id: string, userId: string) => axiosInstance.delete(`/projects/${id}/team/${userId}`),
};

export default projectsService;
