import axiosInstance from './axiosInstance';

const notificationsService = {
  getNotifications: (page = 1) => axiosInstance.get('/notifications', { params: { page } }),
  markAsRead: (id: string) => axiosInstance.put(`/notifications/${id}`),
  markAllAsRead: () => axiosInstance.put('/notifications/mark-all-read'),
};

export default notificationsService;
