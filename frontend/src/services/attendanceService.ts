import axiosInstance from './axiosInstance';

// VITE_API_URL already includes /api
const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '') + '/attendance';

export interface SheetData {
  headers: string[];
  rows: string[][];
  is_leaves: boolean;
  sheet_name: string;
}

const attendanceService = {
  /** Upload a PDF attendance report */
  uploadPdf: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return axiosInstance.post<{ data: { month: string }; message: string }>(
      `${API}/upload-pdf`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  /** Get list of all sheet names */
  getSheets: () =>
    axiosInstance.get<{ data: { sheets: string[] } }>(`${API}/get-sheets`),

  /** Read data from a specific sheet */
  getSheetData: (sheetName: string) =>
    axiosInstance.get<{ data: SheetData }>(
      `${API}/get-sheet-data/${encodeURIComponent(sheetName)}`
    ),

  /** Save edits to a sheet */
  saveSheet: (sheetName: string, headers: string[], rows: string[][]) =>
    axiosInstance.post(`${API}/save-sheet/${encodeURIComponent(sheetName)}`, {
      headers,
      rows,
    }),

  /** Get download URL for master Excel */
  getDownloadUrl: () => `${API}/download-master`,
};

export default attendanceService;
