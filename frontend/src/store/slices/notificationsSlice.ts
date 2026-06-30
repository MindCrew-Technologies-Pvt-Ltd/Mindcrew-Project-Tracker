import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Notification } from '../../types/notification.types';
import notificationsService from '../../services/notificationsService';

interface NotificationsState { notifications: Notification[]; unreadCount: number; loading: boolean; error: string | null; }
const initialState: NotificationsState = { notifications: [], unreadCount: 0, loading: false, error: null };

export const fetchNotificationsThunk = createAsyncThunk('notifications/fetchAll', async (_, { rejectWithValue }) => {
  try { return (await notificationsService.getNotifications()).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const markAsReadThunk = createAsyncThunk('notifications/markRead', async (id: string, { rejectWithValue }) => {
  try { await notificationsService.markAsRead(id); return id; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const markAllAsReadThunk = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try { await notificationsService.markAllAsRead(); } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationsThunk.fulfilled, (state, action) => { state.notifications = action.payload; state.unreadCount = action.payload.filter((n: Notification) => !n.isRead).length; })
      .addCase(markAsReadThunk.fulfilled, (state, action) => { const n = state.notifications.find(x => x.id === action.payload); if (n && !n.isRead) { n.isRead = true; state.unreadCount = Math.max(0, state.unreadCount - 1); } })
      .addCase(markAllAsReadThunk.fulfilled, (state) => { state.notifications.forEach(n => { n.isRead = true; }); state.unreadCount = 0; });
  },
});

export default notificationsSlice.reducer;
