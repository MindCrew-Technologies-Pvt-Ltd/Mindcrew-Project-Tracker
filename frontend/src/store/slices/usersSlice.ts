import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { User, UpdateUserPayload } from '../../types/user.types';
import usersService from '../../services/usersService';

interface UsersState { list: User[]; currentUser: User | null; pagination: { total: number; page: number; pageSize: number; totalPages: number }; loading: boolean; error: string | null; }
const initialState: UsersState = { list: [], currentUser: null, pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 }, loading: false, error: null };

export const fetchUsersThunk = createAsyncThunk('users/fetchAll', async (filters: Record<string, unknown>, { rejectWithValue }) => {
  try { return (await usersService.getUsers(filters)).data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const fetchUserByIdThunk = createAsyncThunk('users/fetchById', async (id: string, { rejectWithValue }) => {
  try { return (await usersService.getUserById(id)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const updateUserThunk = createAsyncThunk('users/update', async ({ id, payload }: { id: string; payload: UpdateUserPayload }, { rejectWithValue }) => {
  try { return (await usersService.updateUser(id, payload)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const deactivateUserThunk = createAsyncThunk('users/deactivate', async (id: string, { rejectWithValue }) => {
  try { return (await usersService.deactivateUser(id)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const resetUserPasswordThunk = createAsyncThunk('users/resetPassword', async ({ id, newPassword }: { id: string; newPassword: string }, { rejectWithValue }) => {
  try { return (await usersService.resetUserPassword(id, newPassword)).data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const deleteUserThunk = createAsyncThunk('users/delete', async (id: string, { rejectWithValue }) => {
  try { await usersService.deleteUser(id); return id; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed to delete user'); }
});

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: { clearCurrentUser: (state) => { state.currentUser = null; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsersThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => { state.loading = false; state.list = action.payload.data; state.pagination = { total: action.payload.total, page: action.payload.page, pageSize: action.payload.pageSize, totalPages: action.payload.totalPages }; })
      .addCase(fetchUsersThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(fetchUserByIdThunk.fulfilled, (state, action) => { state.currentUser = action.payload; })
      .addCase(updateUserThunk.fulfilled, (state, action) => { state.currentUser = action.payload; const idx = state.list.findIndex(u => u.id === action.payload.id); if (idx !== -1) state.list[idx] = action.payload; })
      .addCase(deactivateUserThunk.fulfilled, (state, action) => { const idx = state.list.findIndex(u => u.id === action.payload.id); if (idx !== -1) state.list[idx] = action.payload; })
      .addCase(deleteUserThunk.fulfilled, (state, action) => { state.list = state.list.filter(u => u.id !== action.payload); state.pagination.total = Math.max(0, state.pagination.total - 1); })
      .addCase(deleteUserThunk.rejected, (state, action) => { state.error = action.payload as string; });
  },
});

export const { clearCurrentUser } = usersSlice.actions;
export default usersSlice.reducer;
