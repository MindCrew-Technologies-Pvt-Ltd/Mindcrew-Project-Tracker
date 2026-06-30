import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { WeeklyUpdate, CreateWeeklyUpdatePayload } from '../../types/weeklyUpdate.types';
import weeklyUpdatesService from '../../services/weeklyUpdatesService';

interface WeeklyUpdatesState {
  updates: Record<string, WeeklyUpdate[]>;
  currentUpdate: WeeklyUpdate | null;
  loading: boolean;
  error: string | null;
}

const initialState: WeeklyUpdatesState = { updates: {}, currentUpdate: null, loading: false, error: null };

export const fetchWeeklyUpdatesThunk = createAsyncThunk('weeklyUpdates/fetchAll', async (projectId: string, { rejectWithValue }) => {
  try { return { projectId, data: (await weeklyUpdatesService.getWeeklyUpdates(projectId)).data.data }; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const createWeeklyUpdateThunk = createAsyncThunk('weeklyUpdates/create', async ({ projectId, payload }: { projectId: string; payload: CreateWeeklyUpdatePayload }, { rejectWithValue }) => {
  try { return { projectId, data: (await weeklyUpdatesService.createWeeklyUpdate(projectId, payload)).data.data }; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const updateWeeklyUpdateThunk = createAsyncThunk('weeklyUpdates/update', async ({ projectId, updateId, payload }: { projectId: string; updateId: string; payload: Partial<CreateWeeklyUpdatePayload> }, { rejectWithValue }) => {
  try { return { projectId, data: (await weeklyUpdatesService.updateWeeklyUpdate(projectId, updateId, payload)).data.data }; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const deleteWeeklyUpdateThunk = createAsyncThunk('weeklyUpdates/delete', async ({ projectId, updateId }: { projectId: string; updateId: string }, { rejectWithValue }) => {
  try { await weeklyUpdatesService.deleteWeeklyUpdate(projectId, updateId); return { projectId, updateId }; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const weeklyUpdatesSlice = createSlice({
  name: 'weeklyUpdates',
  initialState,
  reducers: { clearError: (state) => { state.error = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeeklyUpdatesThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchWeeklyUpdatesThunk.fulfilled, (state, action) => { state.loading = false; state.updates[action.payload.projectId] = action.payload.data; })
      .addCase(fetchWeeklyUpdatesThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createWeeklyUpdateThunk.fulfilled, (state, action) => { if (!state.updates[action.payload.projectId]) state.updates[action.payload.projectId] = []; state.updates[action.payload.projectId].unshift(action.payload.data); })
      .addCase(updateWeeklyUpdateThunk.fulfilled, (state, action) => { const arr = state.updates[action.payload.projectId]; if (arr) { const idx = arr.findIndex(u => u.id === action.payload.data.id); if (idx !== -1) arr[idx] = action.payload.data; } })
      .addCase(deleteWeeklyUpdateThunk.fulfilled, (state, action) => { const arr = state.updates[action.payload.projectId]; if (arr) state.updates[action.payload.projectId] = arr.filter(u => u.id !== action.payload.updateId); });
  },
});

export const { clearError } = weeklyUpdatesSlice.actions;
export default weeklyUpdatesSlice.reducer;
