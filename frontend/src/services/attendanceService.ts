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

  /** Send report via email to all employees */
  sendReport: () => axiosInstance.post(`${API}/send-report`),

  /** Download master Excel */
  downloadMaster() {
    return axiosInstance.get(`${API}/download-master`, { responseType: 'blob' });
  },

  /** Clear all attendance data */
  deleteMaster: () => axiosInstance.delete(`${API}/delete-master`),

  /** Upload a pre-filled Excel sheet directly */
  uploadDirectExcel: (file: File, month: number, year: number) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('month', String(month));
    fd.append('year', String(year));
    return axiosInstance.post<{ data: { sheetName: string }; message: string }>(
      `${API}/upload-excel`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};

export default attendanceService;
