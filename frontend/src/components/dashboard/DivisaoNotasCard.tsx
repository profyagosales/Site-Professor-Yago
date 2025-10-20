import { useMemo, useState } from 'react';
import { Bimester, GradeItem, GradeScheme } from '@/types/gradeScheme';

type Props = {
  teacherId: string;
  scheme: GradeScheme | null;
  onEdit: () => void;
};

const BIMESTRES: Bimester[] = [1, 2, 3, 4];

export default function DivisaoNotasCard({ teacherId, scheme, onEdit }: Props) {
  const [selected, setSelected] = useState<Bimester>(1);

  const itemsByBimester = useMemo(() => groupByBimester(scheme ?? []), [scheme]);
  const items = useMemo(() => itemsByBimester[selected] ?? [], [itemsByBimester, selected]);

  return (
    <section aria-labelledby="divisao-notas-title" className="card" data-teacher-id={teacherId}>
      <header className="card-header">
        <h2 id="divisao-notas-title">Divisão de notas</h2>
        <div className="gap-2 flex items-center">
          <div role="tablist" aria-label="Bimestre" className="flex gap-2">
            {BIMESTRES.map((bimester) => (
              <button
                key={bimester}
                role="tab"
                type="button"
                className={`bimester-chip ${bimester === selected ? 'is-active' : ''}`}
                aria-pressed={bimester === selected}
                onClick={() => setSelected(bimester)}
              >
                {bimester}º
              </button>
            ))}
          </div>
          <button className="btn btn-outline" onClick={onEdit} title="Configurar divisão de notas">
            Editar
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mt-3">
        {items.length ? (
          items.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
              style={{
                background: item.color,
                color: '#fff',
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.15)',
              }}
              title={`${item.name} • ${item.points.toLocaleString('pt-BR')} pts`}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '9999px',
                  background: 'rgba(255,255,255,.85)',
                }}
              />
              {item.name} • {item.points.toLocaleString('pt-BR')} pts
            </span>
          ))
        ) : (
          <p className="text-slate-500">
            Nenhuma divisão configurada para este bimestre. Clique em <strong>Editar</strong>.
          </p>
        )}
      </div>
    </section>
  );
}

function groupByBimester(entries: GradeScheme): Record<Bimester, GradeItem[]> {
  const map: Record<Bimester, GradeItem[]> = { 1: [], 2: [], 3: [], 4: [] };
  entries.forEach((item) => {
    const key: Bimester = ([1, 2, 3, 4] as Bimester[]).includes(item.bimester) ? item.bimester : 1;
    map[key] = [...map[key], item];
  });
  return map;
}
