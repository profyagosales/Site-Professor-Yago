import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import { ROUTES } from '@/routes';
import { STORAGE_TOKEN_KEY } from '@/services/api';
import { isPublicRoute, shouldRedirectToLogin, getUserTypeFromRoute } from '@/lib/route-guards';

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

  // Se é rota pública, nunca redirecionar
  if (isPublicRoute(location.pathname)) {
    console.info('[RequireAuth] Rota pública - não redirecionar:', location.pathname);
    return <Outlet />;
  }

  // Verificar se deve redirecionar baseado na rota e token
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  const redirectInfo = shouldRedirectToLogin(location.pathname, token, detectedUserType);
  
  if (redirectInfo.shouldRedirect && redirectInfo.loginRoute) {
    console.info('[RequireAuth] Redirecionando para login:', redirectInfo.loginRoute);
    return <Navigate to={redirectInfo.loginRoute} replace state={{ from: location }} />;
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
