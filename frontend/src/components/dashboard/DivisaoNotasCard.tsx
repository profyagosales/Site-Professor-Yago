import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SCHEME, fetchGradeScheme } from '@/services/gradeScheme';
import type { Bimestre, GradeItem, GradeScheme } from '@/services/gradeScheme';

const BIMESTRES: Bimestre[] = [1, 2, 3, 4];
const DEFAULT_BADGE_COLOR = '#FF8A00';

type Props = {
  ano: number;
  onEdit: (scheme: GradeScheme) => void;
  refreshToken?: number;
};

export default function DivisaoNotasCard({ ano, onEdit, refreshToken = 0 }: Props) {
  const [selectedBim, setSelectedBim] = useState<Bimestre>(1);
  const [scheme, setScheme] = useState<GradeScheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchGradeScheme(ano);
        if (!active) return;
        setScheme(data);
      } catch {
        if (!active) return;
        setScheme(DEFAULT_SCHEME(ano));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ano, refreshToken]);

  const itens = useMemo(() => {
    if (!scheme) return [] as GradeItem[];
    return scheme.itensPorBimestre?.[selectedBim] ?? [];
  }, [scheme, selectedBim]);

  const handleEdit = () => {
    onEdit(scheme ?? DEFAULT_SCHEME(ano));
  };

  return (
    <div className="card">
      <div className="card-header flex flex-wrap items-center justify-between gap-3">
        <h3 className="card-title">Divisão de notas</h3>
        <div className="flex flex-wrap items-center gap-2">
          {BIMESTRES.map((b) => (
            <button
              key={b}
              className="bim-pill"
              data-active={selectedBim === b}
              onClick={() => setSelectedBim(b)}
              type="button"
            >
              {b}º
            </button>
          ))}
        </div>
        <button className="btn btn-light" onClick={handleEdit} type="button">
          Editar
        </button>
      </div>

      <div className="card-body">
        {loading ? (
          <p className="text-slate-500">Carregando divisão de notas...</p>
        ) : itens.length === 0 ? (
          <p className="text-slate-500">
            Nenhuma divisão configurada para este bimestre. Clique em <strong>Editar</strong>.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {itens.map((item) => (
              <Chip key={item.id ?? item.nome} item={item} />
            ))}
          </div>
        )}
      </div>

      <div className="card-footer text-xs text-slate-400">
        * A divisão fica visível para os alunos nos boletins e relatórios.
      </div>
    </div>
  );
}

function Chip({ item }: { item: GradeItem }) {
  const color = item.cor && item.cor.trim() ? item.cor : DEFAULT_BADGE_COLOR;
  const textColor = getReadableText(color);

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
      style={{ background: color, color: textColor }}
      title={item.tipo ? `${item.tipo}` : undefined}
    >
      {item.nome} • {formatPts(item.pontos)} pts
    </span>
  );
}

function formatPts(value: number) {
  return Number(value ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function getReadableText(bg: string) {
  try {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160 ? '#111' : '#fff';
  } catch {
    return '#111';
  }
}
