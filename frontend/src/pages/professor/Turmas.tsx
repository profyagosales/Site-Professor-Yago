import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listClasses, ClassSummary } from '@/services/classes.service';

export default function TurmasPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ClassSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
  const list = await listClasses();
        if (alive) setItems(list);
      } catch (e: any) {
        console.error('Falha ao carregar turmas', e);
        if (alive) setError('Não foi possível carregar as turmas agora.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h1 className="mb-1 text-3xl font-semibold text-slate-900">Turmas</h1>
      <p className="mb-6 text-slate-500">Gerencie turmas, alunos e avaliações.</p>

      {loading && <p>Carregando…</p>}
      {!loading && error && <p className="text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && <p>Nenhuma turma encontrada.</p>}

      {!loading && !error && items.length > 0 && (
        <ul className="grid gap-4">
          {items.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => navigate(`/professor/classes/${t.id}`)}
                className="flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ys-amber"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-slate-900">
                      {t.series ?? '—'}{t.letter ?? ''}
                    </div>
                    <div className="text-sm text-slate-500">{t.discipline ?? 'Disciplina'}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>Alunos: {t.studentsCount}</span>
                  <span>Professores: {t.teachersCount}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

