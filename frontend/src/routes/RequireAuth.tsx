import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import { ROUTES } from '@/routes';
import { STORAGE_TOKEN_KEY } from '@/services/api';

interface RequireAuthProps {
  userType?: 'professor' | 'aluno';
}

export default function RequireAuth({ userType }: RequireAuthProps) {
  const { state } = useAuth();
  const location = useLocation();

  // Detecta o tipo de usuário pela URL se não foi especificado
  const detectedUserType =
    userType ||
    (location.pathname.startsWith('/aluno') ? 'aluno' : 'professor');

  // Se não tem token, redireciona imediatamente para o login correto
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  if (!token) {
    const loginRoute =
      detectedUserType === 'aluno'
        ? ROUTES.auth.loginAluno
        : ROUTES.auth.loginProf;
    return <Navigate to={loginRoute} replace state={{ from: location }} />;
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
    const loginRoute =
      detectedUserType === 'aluno'
        ? ROUTES.auth.loginAluno
        : ROUTES.auth.loginProf;
    return <Navigate to={loginRoute} replace state={{ from: location }} />;
  }

  // Verifica se o tipo de usuário corresponde ao esperado
  if (detectedUserType === 'aluno' && state.role !== 'aluno') {
    return (
      <Navigate
        to={ROUTES.auth.loginAluno}
        replace
        state={{ from: location }}
      />
    );
  }

  if (detectedUserType === 'professor' && state.role !== 'professor') {
    return (
      <Navigate to={ROUTES.auth.loginProf} replace state={{ from: location }} />
    );
  }

  return <Outlet />;
}
