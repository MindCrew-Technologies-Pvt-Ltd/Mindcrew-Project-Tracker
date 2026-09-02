import axiosInstance from './axiosInstance';

// VITE_API_URL already includes /api (e.g. https://xxx.railway.app/api)
const API = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '') + '/availability';

export type AvailabilityStatus =
  | 'FULLY_AVAILABLE'
  | 'PARTIALLY_AVAILABLE'
  | 'IN_TRAINING'
  | 'ON_LEAVE'
  | 'BUSY';

export interface DailyAvailability {
  id: string;
  userId: string;
  date: string;
  status: AvailabilityStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    employeeId: string | null;
    department: string | null;
    designation: string | null;
    jobRoles: string[];
  };
}

export interface UpsertPayload {
  status: AvailabilityStatus;
  note?: string;
  date?: string; // YYYY-MM-DD, defaults to today
}

const availabilityService = {
  upsert: (data: UpsertPayload) =>
    axiosInstance.post<{ data: DailyAvailability }>(API, data),

  getMyHistory: () =>
    axiosInstance.get<{ data: DailyAvailability[] }>(`${API}/me`),

  getToday: () =>
    axiosInstance.get<{ data: DailyAvailability | null }>(`${API}/today`),

  getAll: (params?: { date?: string; status?: string }) =>
    axiosInstance.get<{ data: DailyAvailability[] }>(`${API}/all`, { params }),
};

export default availabilityService;
