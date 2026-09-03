import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import LoadingSpinner from './LoadingSpinner';
import { isAdmin } from '../../utils/roleGuards';

interface Props { requiredRole?: string; }

const ProtectedRoute = ({ requiredRole }: Props) => {
  const { isAuthenticated, user, loading } = useAppSelector((state) => state.auth);

  if (loading) return <LoadingSpinner fullScreen />;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  if (requiredRole === ROLES.ADMIN && !isAdmin(user)) return <Navigate to={ROUTES.DASHBOARD} replace />;

  return <Outlet />;
};

export default ProtectedRoute;
