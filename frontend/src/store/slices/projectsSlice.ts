import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Project, ProjectFilters, CreateProjectPayload } from '../../types/project.types';
import projectsService from '../../services/projectsService';

interface ProjectsState {
  list: Project[];
  currentProject: Project | null;
  filters: ProjectFilters;
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
  loading: boolean;
  error: string | null;
  /** requestId of the newest list fetch — older responses arriving late are dropped. */
  latestListRequestId: string | null;
}

const initialState: ProjectsState = {
  list: [],
  currentProject: null,
  filters: { page: 1, pageSize: 10 },
  pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
  loading: false,
  error: null,
  latestListRequestId: null,
};

export const fetchProjectsThunk = createAsyncThunk('projects/fetchAll', async (filters: ProjectFilters, { rejectWithValue }) => {
  try { return (await projectsService.getProjects(filters)).data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const fetchProjectByIdThunk = createAsyncThunk('projects/fetchById', async (id: string, { rejectWithValue }) => {
  try { return (await projectsService.getProjectById(id)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const createProjectThunk = createAsyncThunk('projects/create', async (payload: CreateProjectPayload, { rejectWithValue }) => {
  try { return (await projectsService.createProject(payload)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const updateProjectThunk = createAsyncThunk('projects/update', async ({ id, payload }: { id: string; payload: Partial<CreateProjectPayload> }, { rejectWithValue }) => {
  try { return (await projectsService.updateProject(id, payload)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const deleteProjectThunk = createAsyncThunk('projects/delete', async (id: string, { rejectWithValue }) => {
  try { await projectsService.deleteProject(id); return id; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const archiveProjectThunk = createAsyncThunk('projects/archive', async (id: string, { rejectWithValue }) => {
  try { return (await projectsService.archiveProject(id)).data.data; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload }; },
    clearCurrentProject: (state) => { state.currentProject = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // The list page can fire overlapping fetches (filter effects settling on
      // mount, My Projects → All Projects). Only the newest request may write,
      // or a slow stale response overwrites the correct list/pagination.
      .addCase(fetchProjectsThunk.pending, (state, action) => { state.loading = true; state.error = null; state.latestListRequestId = action.meta.requestId; })
      .addCase(fetchProjectsThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestListRequestId) return;
        state.loading = false; state.list = action.payload.data; state.pagination = { total: action.payload.total, page: action.payload.page, pageSize: action.payload.pageSize, totalPages: action.payload.totalPages };
      })
      .addCase(fetchProjectsThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestListRequestId) return;
        state.loading = false; state.error = action.payload as string;
      })
      .addCase(fetchProjectByIdThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchProjectByIdThunk.fulfilled, (state, action) => { state.loading = false; state.currentProject = action.payload; })
      .addCase(fetchProjectByIdThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createProjectThunk.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(updateProjectThunk.fulfilled, (state, action) => { state.currentProject = action.payload; const idx = state.list.findIndex(p => p.id === action.payload.id); if (idx !== -1) state.list[idx] = action.payload; })
      .addCase(deleteProjectThunk.fulfilled, (state, action) => { state.list = state.list.filter(p => p.id !== action.payload); })
      .addCase(archiveProjectThunk.fulfilled, (state, action) => { state.currentProject = action.payload; const idx = state.list.findIndex(p => p.id === action.payload.id); if (idx !== -1) state.list[idx] = action.payload; });
  },
});

export const { setFilters, clearCurrentProject, clearError } = projectsSlice.actions;
export default projectsSlice.reducer;
