import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import api from '@/services/api';

type GuardStatus = 'checking' | 'allow' | 'deny';

export default function TeacherGuard({ children }: PropsWithChildren) {
  const { loading, isTeacher, setSession, reload } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<GuardStatus>('checking');

  const initialRole = useMemo(() => {
    try {
      return localStorage.getItem('role');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    if (isTeacher || initialRole === 'teacher') {
      if (!isTeacher && initialRole === 'teacher') {
        void reload();
      }
      setStatus('allow');
      return;
    }

    setStatus('checking');

    let cancelled = false;
    (async () => {
      const me = await api
        .get('/me', { withCredentials: true, meta: { skipAuthRedirect: true, noCache: true } })
        .catch(() => null);

      if (cancelled) return;

      const payload = me?.data ?? null;
      const payloadRole = (payload?.role ?? payload?.user?.role ?? '') as string;
      const teacherFlag =
        (typeof payloadRole === 'string' && payloadRole.toLowerCase() === 'teacher') || Boolean(payload?.isTeacher);

      if (teacherFlag) {
        try {
          localStorage.setItem('role', 'teacher');
        } catch {
          /* ignore */
        }
        setSession?.({
          role: 'teacher',
          user: payload?.user ?? { id: payload?.id ?? null, email: payload?.email ?? null, role: 'teacher' },
        });
        setStatus('allow');
        return;
      }

      setStatus('deny');
    })();

    return () => {
      cancelled = true;
    };
  }, [isTeacher, loading, initialRole, setSession, reload]);

  if (status === 'checking') {
    return <div className="p-6">Carregando…</div>;
  }

  if (status === 'allow') {
    return <>{children}</>;
  }

  console.warn('TeacherGuard blocked access to professor route', location.pathname);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ys-ink">Acesso restrito</h1>
        <p className="mt-2 text-ys-ink-2">
          Esta área é exclusiva para professores. Se você precisa de acesso, fale com a coordenação ou suporte.
        </p>
      </div>
      <div>
        <Link to="/aluno/notas" className="inline-flex items-center gap-1 text-ys-amber hover:text-ys-amber/80">
          Ir para área do aluno
        </Link>
      </div>
    </div>
  );
}
