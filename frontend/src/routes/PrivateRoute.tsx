import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { ROUTES } from '@/routes';

export default function PrivateRoute() {
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      setState('fail');
      return;
    }
    api
      .get('/auth/me')
      .then(() => setState('ok'))
      .catch(() => setState('fail'));
  }, []);

  if (state === 'loading') return null;
  return state === 'ok' ? (
    <Outlet />
  ) : (
    <Navigate to={ROUTES.auth.loginProf} replace />
  );
}
