import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import { ROUTES } from '@/routes';
import { STORAGE_TOKEN_KEY } from '@/services/api';

export default function RequireStudentAuth() {
  const { state } = useAuth();
  const location = useLocation();

  // Se não tem token, redireciona imediatamente para o login do aluno
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) {
    return (
      <Navigate to={ROUTES.aluno.login} replace state={{ from: location }} />
    );
  }

  // Se tem token mas ainda está carregando (validando com /auth/me), mostra loading
  if (state.loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não está carregando e não tem role, significa que a validação falhou
  if (!state.role) {
    return (
      <Navigate to={ROUTES.aluno.login} replace state={{ from: location }} />
    );
  }

  // Verifica se o usuário é aluno
  if (state.role !== 'aluno') {
    return (
      <Navigate to={ROUTES.aluno.login} replace state={{ from: location }} />
    );
  }

  return <Outlet />;
}
