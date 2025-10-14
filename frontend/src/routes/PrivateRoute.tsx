import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export default function PrivateRoute() {
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const requestConfig = { meta: { skipAuthRedirect: true, noCache: true } } as const;

      try {
        await api.get('/me', requestConfig);
        if (!cancelled) setState('ok');
        return;
      } catch (err) {
        if (cancelled) return;
        try {
          await api.get('/auth/me', requestConfig);
          if (!cancelled) {
            setState('ok');
            return;
          }
        } catch {
          if (!cancelled) setState('fail');
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') return null;
  return state === 'ok' ? <Outlet /> : <Navigate to="/login-professor" replace />;
}
