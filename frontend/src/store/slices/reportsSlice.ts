import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ReportType, ReportFilters, ExportFormat } from '../../types/report.types';
import reportsService from '../../services/reportsService';

interface ReportsState { reportData: Record<string, unknown>; exportStatus: 'idle' | 'loading' | 'done'; loading: boolean; error: string | null; }
const initialState: ReportsState = { reportData: {}, exportStatus: 'idle', loading: false, error: null };

export const generateReportThunk = createAsyncThunk('reports/generate', async ({ type, filters }: { type: ReportType; filters: ReportFilters }, { rejectWithValue }) => {
  try { return { type, data: (await reportsService.getReport(type, filters)).data.data }; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const exportReportThunk = createAsyncThunk('reports/export', async ({ type, format, filters }: { type: ReportType; format: ExportFormat; filters: ReportFilters }, { rejectWithValue }) => {
  try {
    const res = await reportsService.exportReport(type, filters);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_${type.toLowerCase()}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Export failed'); }
});

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(generateReportThunk.pending, (state) => { state.loading = true; })
      .addCase(generateReportThunk.fulfilled, (state, action) => { state.loading = false; state.reportData[action.payload.type] = action.payload.data; })
      .addCase(generateReportThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(exportReportThunk.pending, (state) => { state.exportStatus = 'loading'; })
      .addCase(exportReportThunk.fulfilled, (state) => { state.exportStatus = 'done'; })
      .addCase(exportReportThunk.rejected, (state) => { state.exportStatus = 'idle'; });
  },
});

export default reportsSlice.reducer;
