import axiosInstance from './axiosInstance';
import { User } from '../types/user.types';

export interface FlexibleResource {
  id: string;
  userId: string;
  createdAt: string;
  user: User;
}

const flexibleResourceService = {
  getFlexibleResources: () => axiosInstance.get('/flexible-resources'),
  addFlexibleResource: (userId: string) => axiosInstance.post('/flexible-resources', { userId }),
  removeFlexibleResource: (userId: string) => axiosInstance.delete(`/flexible-resources/${userId}`),
};

export default flexibleResourceService;
