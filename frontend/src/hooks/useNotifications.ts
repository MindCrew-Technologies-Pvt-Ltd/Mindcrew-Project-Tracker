import { useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { fetchNotificationsThunk } from '../store/slices/notificationsSlice';

export const useNotifications = () => {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, loading } = useAppSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchNotificationsThunk());
    const interval = setInterval(() => dispatch(fetchNotificationsThunk()), 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  return { notifications, unreadCount, loading };
};
