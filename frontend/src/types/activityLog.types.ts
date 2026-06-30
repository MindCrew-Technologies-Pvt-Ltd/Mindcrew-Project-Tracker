import { User } from './user.types';

export interface ActivityLog {
  id: string;
  userId: string;
  user: User;
  action: string;
  module: string;
  description: string;
  ipAddress: string;
  browser?: string;
  createdAt: string;
}
