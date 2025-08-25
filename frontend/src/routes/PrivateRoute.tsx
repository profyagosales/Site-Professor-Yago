import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/lib/http';

export default function PrivateRoute() {
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    api.get('/auth/me')
      .then(() => setState('ok'))
      .catch(() => setState('fail'));
  }, []);

  if (state === 'loading') return null;
  return state === 'ok' ? <Outlet /> : <Navigate to="/login-professor" replace />;
}
