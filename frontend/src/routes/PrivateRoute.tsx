import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { ROUTES } from '@/routes';
import { shouldCallAuthMe, isPublicRoute } from '@/lib/route-guards';
import { useLocation } from 'react-router-dom';

export default function PrivateRoute() {
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');
  const location = useLocation();

  useEffect(() => {
    // Se é rota pública, não verificar autenticação
    if (isPublicRoute(location.pathname)) {
      setState('ok');
      return;
    }

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      setState('fail');
      return;
    }

    // Verificar se deve chamar /auth/me
    if (!shouldCallAuthMe(token)) {
      setState('fail');
      return;
    }

    api
      .get('/auth/me')
      .then(() => setState('ok'))
      .catch(() => setState('fail'));
  }, [location.pathname]);

  if (state === 'loading') return null;
  return state === 'ok' ? (
    <Outlet />
  ) : (
    <Navigate to={ROUTES.auth.loginProf} replace />
  );
}
