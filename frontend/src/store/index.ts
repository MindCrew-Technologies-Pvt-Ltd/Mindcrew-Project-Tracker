import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectsReducer from './slices/projectsSlice';
import weeklyUpdatesReducer from './slices/weeklyUpdatesSlice';
import documentsReducer from './slices/documentsSlice';
import notificationsReducer from './slices/notificationsSlice';
import usersReducer from './slices/usersSlice';
import editRequestsReducer from './slices/editRequestsSlice';
import reportsReducer from './slices/reportsSlice';
import timesheetReducer from './slices/timesheetSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    weeklyUpdates: weeklyUpdatesReducer,
    documents: documentsReducer,
    notifications: notificationsReducer,
    users: usersReducer,
    editRequests: editRequestsReducer,
    reports: reportsReducer,
    timesheet: timesheetReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
