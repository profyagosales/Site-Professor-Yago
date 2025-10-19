import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClassCard } from '@/components/class/ClassCard';
import { listClasses, ClassSummary } from '@/services/classes.service';

type UiClassItem = {
  id: string;
  name: string;
  subject: string;
  year?: number | null;
  seriesLabel?: string | null;
  studentsCount: number;
  teachersCount: number;
  color?: string | null;
};

function formatSeriesLabel(item: ClassSummary): string | null {
  const parts: string[] = [];
  if (item.series != null && item.series !== '') {
    parts.push(String(item.series));
  }
  if (item.letter) {
    parts.push(String(item.letter));
  }
  const label = parts.join('');
  if (label) return label;
  if (item.name && item.name.trim()) return item.name.trim();
  return null;
}

function toUiClass(item: ClassSummary): UiClassItem {
  const name = item.name?.trim() || formatSeriesLabel(item) || 'Turma';
  const subject = item.discipline?.trim() || item.subject?.trim() || 'Disciplina';
  return {
    id: item.id,
    name,
    subject,
    year: item.year ?? undefined,
    seriesLabel: formatSeriesLabel(item),
    studentsCount: item.studentsCount ?? 0,
    teachersCount: item.teachersCount ?? 0,
    color: item.color ?? null,
  };
}

export default function TurmasPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UiClassItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listClasses();
        if (alive) setItems(list.map(toUiClass));
      } catch (e: any) {
        console.error('Falha ao carregar turmas', e);
        if (alive) setError('Não foi possível carregar as turmas agora.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 md:px-10">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-semibold text-slate-900">Turmas</h1>
          <p className="text-sm text-slate-500">Selecione uma turma para gerenciar alunos, agenda e avaliações.</p>
        </div>

        {loading && (
          <div className="grid place-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-64 w-full max-w-[360px] animate-pulse rounded-3xl bg-white/70 shadow-sm"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && sortedItems.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma turma cadastrada ainda.</p>
        )}

        {!loading && !error && sortedItems.length > 0 && (
          <div className="grid justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedItems.map((item) => (
              <ClassCard
                key={item.id}
                id={item.id}
                name={item.name}
                subject={item.subject}
                year={item.year}
                seriesLabel={item.seriesLabel}
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
