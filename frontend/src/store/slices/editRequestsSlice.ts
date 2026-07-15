import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { EditRequest } from '../../types/editRequest.types';
import editRequestsService from '../../services/editRequestsService';

interface EditRequestsState { requests: EditRequest[]; pagination: { total: number; page: number; pageSize: number; totalPages: number }; loading: boolean; error: string | null; }
const initialState: EditRequestsState = { requests: [], pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 }, loading: false, error: null };

export const fetchEditRequestsThunk = createAsyncThunk('editRequests/fetchAll', async (filters: Record<string, unknown>, { rejectWithValue }) => {
  try { return (await editRequestsService.getEditRequests(filters)).data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const approveEditRequestThunk = createAsyncThunk('editRequests/approve', async (id: string, { rejectWithValue }) => {
  try { return (await editRequestsService.approveEditRequest(id)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const rejectEditRequestThunk = createAsyncThunk('editRequests/reject', async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
  try { return (await editRequestsService.rejectEditRequest(id, reason)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const revokeEditRequestThunk = createAsyncThunk('editRequests/revoke', async (id: string, { rejectWithValue }) => {
  try { return (await editRequestsService.revokeEditRequest(id)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const editRequestsSlice = createSlice({
  name: 'editRequests',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEditRequestsThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchEditRequestsThunk.fulfilled, (state, action) => { state.loading = false; state.requests = action.payload.data; state.pagination = { total: action.payload.total, page: action.payload.page, pageSize: action.payload.pageSize, totalPages: action.payload.totalPages }; })
      .addCase(fetchEditRequestsThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(approveEditRequestThunk.fulfilled, (state, action) => { const idx = state.requests.findIndex(r => r.id === action.payload.id); if (idx !== -1) state.requests[idx] = action.payload; })
      .addCase(rejectEditRequestThunk.fulfilled, (state, action) => { const idx = state.requests.findIndex(r => r.id === action.payload.id); if (idx !== -1) state.requests[idx] = action.payload; })
      .addCase(revokeEditRequestThunk.fulfilled, (state, action) => { const idx = state.requests.findIndex(r => r.id === action.payload.id); if (idx !== -1) state.requests[idx] = action.payload; });
  },
});

export default editRequestsSlice.reducer;
