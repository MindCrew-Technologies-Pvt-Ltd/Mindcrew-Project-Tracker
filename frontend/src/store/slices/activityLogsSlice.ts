import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ActivityLog } from '../../types/activityLog.types';
import activityLogsService from '../../services/activityLogsService';

interface ActivityLogsState { logs: ActivityLog[]; filters: Record<string, unknown>; pagination: { total: number; page: number; pageSize: number; totalPages: number }; loading: boolean; error: string | null; }
const initialState: ActivityLogsState = { logs: [], filters: {}, pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 }, loading: false, error: null };

export const fetchActivityLogsThunk = createAsyncThunk('activityLogs/fetchAll', async (params: Record<string, unknown>, { rejectWithValue }) => {
  try { return (await activityLogsService.getActivityLogs(params)).data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const activityLogsSlice = createSlice({
  name: 'activityLogs',
  initialState,
  reducers: { setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload }; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivityLogsThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchActivityLogsThunk.fulfilled, (state, action) => { state.loading = false; state.logs = action.payload.data; state.pagination = { total: action.payload.total, page: action.payload.page, pageSize: action.payload.pageSize, totalPages: action.payload.totalPages }; })
      .addCase(fetchActivityLogsThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });
  },
});

export const { setFilters } = activityLogsSlice.actions;
export default activityLogsSlice.reducer;
