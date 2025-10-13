import { useEffect, useState } from 'react';
import { listProfessorClasses, ClassItem } from '@/services/classes.service';

export default function TurmasPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ClassItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listProfessorClasses();
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
            <div key={t._id} className="border rounded-lg p-3 bg-white">
              <div className="font-medium">
                {t.series ?? '—'}{t.letter ?? ''} • {t.discipline ?? 'Disciplina'}
              </div>
              <div className="text-sm text-gray-500">
                Alunos: {t.students?.length ?? 0} • Professores: {t.teachers?.length ?? 0}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

