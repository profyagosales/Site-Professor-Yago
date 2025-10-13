import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listClasses, ClassSummary } from '@/services/classes.service';
import { Button } from '@/components/ui/Button';

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
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-1">Turmas</h1>
      <p className="text-gray-500 mb-4">Gerencie turmas, alunos e avaliações.</p>

      {loading && <p>Carregando…</p>}
      {!loading && error && <p className="text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && <p>Nenhuma turma encontrada.</p>}

      {!loading && !error && items.length > 0 && (
        <div className="grid gap-3">
          {items.map((t) => (
            <div
              key={t.id}
              className="border rounded-xl p-4 bg-white shadow-ys-sm hover:shadow-ys-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold text-ys-ink">
                    {t.series ?? '—'}{t.letter ?? ''}
                  </div>
                  <div className="text-sm text-ys-graphite">{t.discipline ?? 'Disciplina'}</div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/professor/classes/${t.id}`)}
                >
                  Ver detalhes
                </Button>
              </div>
              <div className="mt-3 text-sm text-ys-graphite">
                <span className="mr-4">Alunos: {t.studentsCount}</span>
                <span>Professores: {t.teachersCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

