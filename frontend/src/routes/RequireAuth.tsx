import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import { ROUTES } from '@/routes';
import { STORAGE_TOKEN_KEY } from '@/services/api';

export default function RequireAuth() {
  const { state } = useAuth();
  const loc = useLocation();

  if (state.loading) return null; // ou um spinner leve
  if (!localStorage.getItem(STORAGE_TOKEN_KEY)) {
    return <Navigate to={ROUTES.auth.loginProf} replace state={{ from: loc }} />;
  }
  return <Outlet />;
}
