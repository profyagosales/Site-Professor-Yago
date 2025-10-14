import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import { fetchMe } from '@/services/session';

type GuardStatus = 'checking' | 'allow' | 'deny';

export default function StudentGuard({ children }: PropsWithChildren) {
  const { loading, isStudent, setSession } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<GuardStatus>('checking');
  const attempted = useRef(false);

  useEffect(() => {
    if (loading) {
      setStatus('checking');
      return;
    }

    if (isStudent) {
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

    const ensureSession = async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me && (me.role ?? '').toLowerCase() === 'student') {
          setSession(me);
          setStatus('allow');
          return;
        }
      } catch (err) {
        console.warn('StudentGuard: falha ao reidratar sessão', err);
      }
      if (!cancelled) {
        setStatus('deny');
      }
    };

    void ensureSession();

    return () => {
      cancelled = true;
    };
  }, [isStudent, loading, setSession]);

  if (status === 'checking') {
    return <div className="p-6">Carregando…</div>;
  }

  if (status === 'allow') {
    return <>{children}</>;
  }

  console.warn('StudentGuard blocked access to student route', location.pathname);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ys-ink">Acesso restrito</h1>
        <p className="mt-2 text-ys-ink-2">
          Esta área é exclusiva para estudantes. Faça login com sua conta para continuar.
        </p>
      </div>
      <div>
        <Link to="/login-aluno" className="inline-flex items-center gap-1 text-ys-amber hover:text-ys-amber/80">
          Ir para login do aluno
        </Link>
      </div>
    </div>
  );
}
