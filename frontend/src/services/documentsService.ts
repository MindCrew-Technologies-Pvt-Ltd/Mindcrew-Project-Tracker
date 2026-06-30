import axiosInstance from './axiosInstance';

const documentsService = {
  getDocuments: (projectId: string) => axiosInstance.get(`/projects/${projectId}/documents`),
  uploadDocument: (projectId: string, formData: FormData, onProgress?: (p: number) => void) =>
    axiosInstance.post(`/projects/${projectId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total)); },
    }),
  deleteDocument: (_projectId: string, docId: string) => axiosInstance.delete(`/documents/${docId}`),
};

export default documentsService;
