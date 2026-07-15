export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
  ownedProjects?: OwnedProject[];
}

export interface OwnedProject {
  id: string;
  name: string;
  clientName?: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface UpdateUserPayload {
  name?: string;
  phone?: string;
  department?: string;
  designation?: string;
}
