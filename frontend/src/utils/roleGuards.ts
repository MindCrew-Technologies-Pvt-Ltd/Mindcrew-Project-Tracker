import { User } from '../types/user.types';
import { ROLES } from '../constants/roles';

export const isAdmin = (user: User | null) => user?.role === ROLES.ADMIN;
export const isEmployee = (user: User | null) => user?.role === ROLES.EMPLOYEE;

export const canEditProject = (user: User | null, projectCreatedById: string, approvedEditRequestExists: boolean) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (user.id === projectCreatedById) return true;
  return approvedEditRequestExists;
};
