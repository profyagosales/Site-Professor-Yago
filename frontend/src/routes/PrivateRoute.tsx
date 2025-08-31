import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export default function PrivateRoute() {
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    api.get('/api/auth/me')
      .then(() => setState('ok'))
      .catch(() => setState('fail'));
  }, []);

  if (state === 'loading') return null;
  return state === 'ok' ? <Outlet /> : <Navigate to="/login-professor" replace />;
}
