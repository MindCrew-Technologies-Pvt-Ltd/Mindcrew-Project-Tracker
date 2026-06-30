import { useAppSelector } from './useAppSelector';
import { isAdmin, isEmployee } from '../utils/roleGuards';

export const useAuth = () => {
  const { user, isAuthenticated, loading, error } = useAppSelector((state) => state.auth);
  return { user, isAuthenticated, loading, error, isAdmin: isAdmin(user), isEmployee: isEmployee(user) };
};
