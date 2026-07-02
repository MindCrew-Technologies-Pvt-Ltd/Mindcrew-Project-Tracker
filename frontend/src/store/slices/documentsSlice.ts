import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ProjectDocument } from '../../types/document.types';
import documentsService from '../../services/documentsService';

interface DocumentsState {
  documents: Record<string, ProjectDocument[]>;
  uploadProgress: Record<string, number>;
  loading: boolean;
  error: string | null;
}

const initialState: DocumentsState = { documents: {}, uploadProgress: {}, loading: false, error: null };

export const fetchDocumentsThunk = createAsyncThunk('documents/fetchAll', async (projectId: string, { rejectWithValue }) => {
  try { return { projectId, data: (await documentsService.getDocuments(projectId)).data.data }; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const uploadDocumentThunk = createAsyncThunk('documents/upload', async ({ projectId, formData, onProgress }: { projectId: string; formData: FormData; onProgress: (p: number) => void }, { rejectWithValue }) => {
  try { return { projectId, data: (await documentsService.uploadDocument(projectId, formData, onProgress)).data.data }; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

export const deleteDocumentThunk = createAsyncThunk('documents/delete', async ({ projectId, docId }: { projectId: string; docId: string }, { rejectWithValue }) => {
  try { await documentsService.deleteDocument(projectId, docId); return { projectId, docId }; } catch (err: any) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setUploadProgress: (state, action) => { state.uploadProgress[action.payload.key] = action.payload.progress; },
    clearUploadProgress: (state, action) => { delete state.uploadProgress[action.payload]; },
    clearDocumentsError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocumentsThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchDocumentsThunk.fulfilled, (state, action) => { state.loading = false; state.documents[action.payload.projectId] = action.payload.data; })
      .addCase(fetchDocumentsThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(uploadDocumentThunk.pending, (state) => { state.error = null; })
      .addCase(uploadDocumentThunk.fulfilled, (state, action) => { if (!state.documents[action.payload.projectId]) state.documents[action.payload.projectId] = []; state.documents[action.payload.projectId].push(action.payload.data); })
      .addCase(uploadDocumentThunk.rejected, (state, action) => { state.error = (action.payload as string) || 'Upload failed'; })
      .addCase(deleteDocumentThunk.fulfilled, (state, action) => { const arr = state.documents[action.payload.projectId]; if (arr) state.documents[action.payload.projectId] = arr.filter(d => d.id !== action.payload.docId); });
  },
});

export const { setUploadProgress, clearUploadProgress, clearDocumentsError } = documentsSlice.actions;
export default documentsSlice.reducer;
