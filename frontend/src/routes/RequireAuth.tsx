import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import { ROUTES } from '@/routes';
import { STORAGE_TOKEN_KEY } from '@/services/api';

interface RequireAuthProps {
  userType?: 'professor' | 'aluno';
}

export default function RequireAuth({ userType = 'professor' }: RequireAuthProps) {
  const { state } = useAuth();
  const loc = useLocation();

  if (state.loading) return null; // ou um spinner leve
  
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) {
    // Redireciona para login apropriado conforme userType
    const loginRoute = userType === 'aluno' ? ROUTES.auth.loginAluno : ROUTES.auth.loginProf;
    return <Navigate to={loginRoute} replace state={{ from: loc }} />;
  }
  
  return <Outlet />;
}
