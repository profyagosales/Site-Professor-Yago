import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClassCard } from '@/components/class/ClassCard';
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
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 md:px-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Turmas</h1>
          <p className="text-sm text-slate-500">Selecione uma turma para gerenciar alunos, agenda e avaliações.</p>
        </div>

        {loading && <p className="text-sm text-slate-500">Carregando…</p>}
        {!loading && error && <p className="text-sm font-medium text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma turma cadastrada ainda.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ClassCard
                key={item.id}
                id={item.id}
                name={item.name ?? `${item.series ?? ''}${item.letter ?? ''}`}
                subject={item.discipline ?? item.subject}
                studentsCount={item.studentsCount}
                teachersCount={item.teachersCount}
                color={item.color}
                onClick={() => navigate(`/professor/classes/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
