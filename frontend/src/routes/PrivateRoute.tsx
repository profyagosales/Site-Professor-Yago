import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/store/AuthContext';

type Status = 'checking' | 'allow' | 'deny';

export default function PrivateRoute() {
  const { loading, user, reload } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<Status>('checking');
  const attempted = useRef(false);

  useEffect(() => {
    if (loading) {
      setStatus('checking');
      return;
    }

    if (user) {
      setStatus('allow');
      return;
    }

    if (attempted.current) {
      setStatus('deny');
      return;
    }

    attempted.current = true;
    setStatus('checking');
    let cancelled = false;

    const ensure = async () => {
      try {
        await reload();
      } catch (error) {
        console.warn('PrivateRoute: falha ao reidratar sessão', error);
      }
      if (cancelled) return;
      // reload altera "loading" e "user"; o efeito será reavaliado.
    };

    void ensure();

    return () => {
      cancelled = true;
    };
  }, [loading, user, reload]);

  if (status === 'checking') {
    return <div className="p-6">Carregando…</div>;
  }

  return status === 'allow' ? <Outlet /> : <Navigate to="/login-professor" state={{ from: location }} replace />;
}
