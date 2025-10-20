import { useMemo, useState } from 'react';
import type { RadarDataset } from '@/types/radar';

interface TopScoresTableProps {
  dataset: RadarDataset | null;
  loading: boolean;
  onFilterChange?: (filters: { classId?: string | null; bimester?: number | null }) => void;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

export default function TopScoresTable({ dataset, loading, onFilterChange }: TopScoresTableProps) {
  const [classFilter, setClassFilter] = useState<string>('all');
  const [bimesterFilter, setBimesterFilter] = useState<string>('current');

  const rows = useMemo(() => {
    if (!dataset) return [];
    return dataset.grades.slice(0, 12).map((grade) => {
      const student = dataset.students.find((item) => item.id === grade.studentId);
      const activity = dataset.activities.find((item) => item.id === grade.activityId);
      const classInfo = dataset.classes.find((item) => item.id === (grade.classId ?? student?.classId ?? ''));
      return {
        id: grade.id,
        studentName: student?.name ?? 'Aluno',
        activityTitle: activity?.title ?? 'Atividade',
        className: classInfo?.name ?? 'Turma',
        classId: classInfo?.id ?? grade.classId ?? null,
        date: activity?.dateISO ? new Date(activity.dateISO).toLocaleDateString('pt-BR') : '--',
        score: Number(grade.value ?? 0).toFixed(1),
        avatar: student?.avatarUrl ?? null,
        initials: student?.initials ?? 'A',
      };
    });
  }, [dataset]);

  const filteredRows = rows.filter((row) => {
    if (classFilter !== 'all' && row.classId !== classFilter) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col gap-3" role="region" aria-label="Ranking de notas">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wide">Filtros</span>
        <label className="flex items-center gap-2">
          <span>Turma</span>
          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            value={classFilter}
            onChange={(event) => {
              const value = event.target.value;
              setClassFilter(value);
              onFilterChange?.({ classId: value === 'all' ? null : value });
            }}
            aria-label="Filtrar por turma"
          >
            <option value="all">Qualquer</option>
            {dataset?.classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span>Bimestre</span>
          <select
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            value={bimesterFilter}
            onChange={(event) => {
              const value = event.target.value;
              setBimesterFilter(value);
              onFilterChange?.({ bimester: value === 'current' ? null : Number(value) });
            }}
            aria-label="Filtrar por bimestre"
          >
            <option value="current">Atual</option>
            <option value="1">1º</option>
            <option value="2">2º</option>
            <option value="3">3º</option>
            <option value="4">4º</option>
          </select>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl bg-white">
        {loading ? (
          <LoadingSkeleton />
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum registro encontrado.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2">
                  Aluno
                </th>
                <th scope="col" className="px-4 py-2">
                  Atividade
                </th>
                <th scope="col" className="px-4 py-2">
                  Turma
                </th>
                <th scope="col" className="px-4 py-2">
                  Data
                </th>
                <th scope="col" className="px-4 py-2 text-right">
                  Nota
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                        {row.avatar ? <img src={row.avatar} alt={row.studentName} className="h-full w-full object-cover" /> : row.initials}
                      </span>
                      <span className="truncate font-medium text-slate-900" title={row.studentName}>
                        {row.studentName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    <span className="line-clamp-1" title={row.activityTitle}>
                      {row.activityTitle}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{row.className}</td>
                  <td className="px-4 py-2 text-slate-600">{row.date}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
