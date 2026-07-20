import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  WeekGridPayload, ActiveTimer, TimesheetWeek, PendingWeekRow,
  CreateTimeEntryPayload, UpdateTimeEntryPayload, CopyWeekPayload, TimeEntry,
} from '../../types/timesheet.types';
import timesheetService from '../../services/timesheetService';

interface TimesheetState {
  week: WeekGridPayload | null;
  weekLoading: boolean;
  timer: ActiveTimer | null;
  pending: { items: PendingWeekRow[]; total: number; page: number; pageSize: number; totalPages: number };
  pendingLoading: boolean;
  myWeeks: TimesheetWeek[];
  error: string | null;
}

const initialState: TimesheetState = {
  week: null,
  weekLoading: false,
  timer: null,
  pending: { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 },
  pendingLoading: false,
  myWeeks: [],
  error: null,
};

interface WeekRef { isoYear: number; isoWeek: number; }

const msg = (err: any, fallback: string) => err.response?.data?.message || fallback;

export const fetchWeekThunk = createAsyncThunk('timesheet/fetchWeek', async ({ isoYear, isoWeek }: WeekRef, { rejectWithValue }) => {
  try { return (await timesheetService.getWeek(isoYear, isoWeek)).data.data as WeekGridPayload; }
  catch (err: any) { return rejectWithValue(msg(err, 'Failed to load the week')); }
});

// Entry CRUD refetches the week afterwards so cell/total math always matches the server.
export const createEntryThunk = createAsyncThunk('timesheet/createEntry',
  async ({ payload, week }: { payload: CreateTimeEntryPayload; week: WeekRef }, { dispatch, rejectWithValue }) => {
    try {
      const entry = (await timesheetService.createEntry(payload)).data.data as TimeEntry;
      await dispatch(fetchWeekThunk(week));
      return entry;
    } catch (err: any) { return rejectWithValue(msg(err, 'Failed to create the entry')); }
  });

export const updateEntryThunk = createAsyncThunk('timesheet/updateEntry',
  async ({ id, payload, week }: { id: string; payload: UpdateTimeEntryPayload; week: WeekRef }, { dispatch, rejectWithValue }) => {
    try {
      const entry = (await timesheetService.updateEntry(id, payload)).data.data as TimeEntry;
      await dispatch(fetchWeekThunk(week));
      return entry;
    } catch (err: any) { return rejectWithValue(msg(err, 'Failed to update the entry')); }
  });

export const deleteEntryThunk = createAsyncThunk('timesheet/deleteEntry',
  async ({ id, week }: { id: string; week: WeekRef }, { dispatch, rejectWithValue }) => {
    try {
      await timesheetService.deleteEntry(id);
      await dispatch(fetchWeekThunk(week));
      return id;
    } catch (err: any) { return rejectWithValue(msg(err, 'Failed to delete the entry')); }
  });

export const copyWeekThunk = createAsyncThunk('timesheet/copyWeek',
  async (payload: CopyWeekPayload, { dispatch, rejectWithValue }) => {
    try {
      const res = (await timesheetService.copyWeek(payload)).data;
      await dispatch(fetchWeekThunk({ isoYear: payload.toIsoYear, isoWeek: payload.toIsoWeek }));
      return res.data as { copied: number };
    } catch (err: any) { return rejectWithValue(msg(err, 'Failed to copy the week')); }
  });

export const submitWeekThunk = createAsyncThunk('timesheet/submitWeek',
  async ({ isoYear, isoWeek }: WeekRef, { dispatch, rejectWithValue }) => {
    try {
      const week = (await timesheetService.submitWeek(isoYear, isoWeek)).data.data as TimesheetWeek;
      await dispatch(fetchWeekThunk({ isoYear, isoWeek }));
      return week;
    } catch (err: any) { return rejectWithValue(msg(err, 'Failed to submit the week')); }
  });

// ---- Timer ----
export const fetchTimerThunk = createAsyncThunk('timesheet/fetchTimer', async (_, { rejectWithValue }) => {
  try { return (await timesheetService.getTimer()).data.data as ActiveTimer | null; }
  catch (err: any) { return rejectWithValue(msg(err, 'Failed to load the timer')); }
});

export const startTimerThunk = createAsyncThunk('timesheet/startTimer',
  async (payload: { projectId: string; description?: string; billable?: boolean }, { rejectWithValue }) => {
    try { return (await timesheetService.startTimer(payload)).data.data as ActiveTimer; }
    catch (err: any) { return rejectWithValue(msg(err, 'Failed to start the timer')); }
  });

export const pauseTimerThunk = createAsyncThunk('timesheet/pauseTimer', async (_, { rejectWithValue }) => {
  try { return (await timesheetService.pauseTimer()).data.data as ActiveTimer; }
  catch (err: any) { return rejectWithValue(msg(err, 'Failed to pause the timer')); }
});

export const resumeTimerThunk = createAsyncThunk('timesheet/resumeTimer', async (_, { rejectWithValue }) => {
  try { return (await timesheetService.resumeTimer()).data.data as ActiveTimer; }
  catch (err: any) { return rejectWithValue(msg(err, 'Failed to resume the timer')); }
});

export const stopTimerThunk = createAsyncThunk('timesheet/stopTimer', async (_, { rejectWithValue }) => {
  try { return (await timesheetService.stopTimer()).data.data as TimeEntry; }
  catch (err: any) { return rejectWithValue(msg(err, 'Failed to stop the timer')); }
});

export const discardTimerThunk = createAsyncThunk('timesheet/discardTimer', async (_, { rejectWithValue }) => {
  try { await timesheetService.discardTimer(); return null; }
  catch (err: any) { return rejectWithValue(msg(err, 'Failed to discard the timer')); }
});

// ---- Approvals ----
export const fetchPendingThunk = createAsyncThunk('timesheet/fetchPending',
  async (params: { status?: string; page?: number; pageSize?: number }, { rejectWithValue }) => {
    try { return (await timesheetService.pending({ pageSize: 50, ...params })).data; }
    catch (err: any) { return rejectWithValue(msg(err, 'Failed to load the queue')); }
  });

export const approveWeekThunk = createAsyncThunk('timesheet/approveWeek', async (id: string, { rejectWithValue }) => {
  try { return (await timesheetService.approve(id)).data.data as TimesheetWeek; }
  catch (err: any) { return rejectWithValue(msg(err, 'Failed to approve the timesheet')); }
});

export const rejectWeekThunk = createAsyncThunk('timesheet/rejectWeek',
  async ({ id, note }: { id: string; note: string }, { rejectWithValue }) => {
    try { return (await timesheetService.reject(id, note)).data.data as TimesheetWeek; }
    catch (err: any) { return rejectWithValue(msg(err, 'Failed to reject the timesheet')); }
  });

export const reopenWeekThunk = createAsyncThunk('timesheet/reopenWeek', async (id: string, { rejectWithValue }) => {
  try { return (await timesheetService.reopen(id)).data.data as TimesheetWeek; }
  catch (err: any) { return rejectWithValue(msg(err, 'Failed to reopen the timesheet')); }
});

export const fetchMyWeeksThunk = createAsyncThunk('timesheet/fetchMyWeeks', async (year: number | undefined, { rejectWithValue }) => {
  try { return (await timesheetService.myWeeks(year)).data.data as TimesheetWeek[]; }
  catch (err: any) { return rejectWithValue(msg(err, 'Failed to load your timesheets')); }
});

const timesheetSlice = createSlice({
  name: 'timesheet',
  initialState,
  reducers: {
    clearTimesheetError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeekThunk.pending, (state) => { state.weekLoading = true; state.error = null; })
      .addCase(fetchWeekThunk.fulfilled, (state, action) => { state.weekLoading = false; state.week = action.payload; })
      .addCase(fetchWeekThunk.rejected, (state, action) => { state.weekLoading = false; state.error = action.payload as string; })

      .addCase(fetchTimerThunk.fulfilled, (state, action) => { state.timer = action.payload; })
      .addCase(startTimerThunk.fulfilled, (state, action) => { state.timer = action.payload; })
      .addCase(pauseTimerThunk.fulfilled, (state, action) => { state.timer = action.payload; })
      .addCase(resumeTimerThunk.fulfilled, (state, action) => { state.timer = action.payload; })
      .addCase(stopTimerThunk.fulfilled, (state) => { state.timer = null; })
      .addCase(discardTimerThunk.fulfilled, (state) => { state.timer = null; })

      .addCase(fetchPendingThunk.pending, (state) => { state.pendingLoading = true; state.error = null; })
      .addCase(fetchPendingThunk.fulfilled, (state, action) => {
        state.pendingLoading = false;
        state.pending = {
          items: action.payload.data,
          total: action.payload.total,
          page: action.payload.page,
          pageSize: action.payload.pageSize,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchPendingThunk.rejected, (state, action) => { state.pendingLoading = false; state.error = action.payload as string; })

      .addCase(approveWeekThunk.fulfilled, (state, action) => {
        state.pending.items = state.pending.items.filter((w) => w.id !== action.payload.id);
      })
      .addCase(rejectWeekThunk.fulfilled, (state, action) => {
        state.pending.items = state.pending.items.filter((w) => w.id !== action.payload.id);
      })

      .addCase(fetchMyWeeksThunk.fulfilled, (state, action) => { state.myWeeks = action.payload; });
  },
});

export const { clearTimesheetError } = timesheetSlice.actions;
export default timesheetSlice.reducer;
