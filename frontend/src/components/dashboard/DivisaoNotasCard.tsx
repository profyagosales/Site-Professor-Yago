import { useMemo, useState } from 'react';
import { GradeSchemeByBimester, Bimester } from '@/types/gradeScheme';

type Props = {
  teacherId: string;
  scheme: GradeSchemeByBimester | null;
  onEdit: () => void;
};

const BIMESTRES: Bimester[] = [1, 2, 3, 4];

export default function DivisaoNotasCard({ teacherId, scheme, onEdit }: Props) {
  const [active, setActive] = useState<Bimester>(1);

  const items = useMemo(() => scheme?.[active] ?? [], [scheme, active]);

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
                className={`bimester-chip ${b === active ? 'is-active' : ''}`}
                aria-pressed={b === active}
                onClick={() => setActive(b)}
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

      {!items.length && (
        <p className="text-foreground/60">
          Nenhuma divisão configurada para este bimestre. Clique em <strong>Editar</strong>.
        </p>
      )}

      {!!items.length && (
        <div className="flex flex-wrap gap-2 mt-3">
          {items.map((it) => (
            <span
              key={it.id}
              className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium shadow-sm"
              style={{ backgroundColor: it.color, color: pickContrast(it.color) }}
              title={`${it.type} • ${it.points.toFixed(1)} pts`}
            >
              {it.name} • {it.points.toFixed(1)} pts
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function pickContrast(hex: string) {
  try {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#111' : '#fff';
  } catch {
    return '#111';
  }
}
