import { useMemo, useState } from 'react';
import { GradeSchemeByBimester, Bimester } from '@/types/gradeScheme';

type Props = {
  teacherId: string;
  scheme: GradeSchemeByBimester | null;
  onEdit: () => void;
};

const BIMESTRES: Bimester[] = [1, 2, 3, 4];

export default function DivisaoNotasCard({ teacherId, scheme, onEdit }: Props) {
  const [selected, setSelected] = useState<Bimester>(1);

  const itemsByBim = useMemo(() => scheme ?? ({} as GradeSchemeByBimester), [scheme]);
  const items = useMemo(() => itemsByBim[selected] ?? [], [itemsByBim, selected]);

  return (
    <section
      aria-labelledby="divisao-notas-title"
      className="card"
      data-teacher-id={teacherId}
    >
      <header className="card-header">
        <h2 id="divisao-notas-title">Divisão de notas</h2>
        <div className="gap-2 flex items-center">
          <div role="tablist" aria-label="Bimestre" className="flex gap-2">
            {BIMESTRES.map((b) => (
              <button
                key={b}
                role="tab"
                type="button"
                className={`bimester-chip ${b === selected ? 'is-active' : ''}`}
                aria-pressed={b === selected}
                onClick={() => setSelected(b)}
              >
                {b}º
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
          items.map((it) => (
            <span
              key={it.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
              style={{
                background: it.color,
                color: '#fff',
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.15)',
              }}
              title={`${it.name} • ${it.points.toLocaleString('pt-BR')} pts`}
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
              {it.name} • {it.points.toLocaleString('pt-BR')} pts
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
