import { User } from './user.types';

export type LeaveType = 'FULL_DAY' | 'HALF_DAY' | 'WFH';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  
  user?: Partial<User>;
  reviewedBy?: Partial<User>;
}

export interface CreateLeaveRequestPayload {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateLeaveStatusPayload {
  status: 'APPROVED' | 'REJECTED';
}
