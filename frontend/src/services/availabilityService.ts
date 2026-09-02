import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';
const API = `${BASE}/api/availability`;

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
    axios.post<{ data: DailyAvailability }>(API, data, { withCredentials: true }),

  getMyHistory: () =>
    axios.get<{ data: DailyAvailability[] }>(`${API}/me`, { withCredentials: true }),

  getToday: () =>
    axios.get<{ data: DailyAvailability | null }>(`${API}/today`, { withCredentials: true }),

  getAll: (params?: { date?: string; status?: string }) =>
    axios.get<{ data: DailyAvailability[] }>(`${API}/all`, {
      params,
      withCredentials: true,
    }),
};

export default availabilityService;
