import { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';

export default function TeacherGuard({ children }: PropsWithChildren) {
  const { loading, isTeacher } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-6">Carregando…</div>;
  }

  if (isTeacher) {
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
