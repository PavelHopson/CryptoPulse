import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Loader } from './Loader';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps): JSX.Element => {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth" replace />;

  return children;
};
