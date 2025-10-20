import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SCHEME,
  fetchGradeScheme,
  type Bimestre,
  type GradeScheme,
  type GradeSchemeItem,
} from '@/services/gradeScheme';

const BIMESTERS: Bimestre[] = [1, 2, 3, 4];

type Props = {
  ano: number;
  classId: string | null;
  onEdit: (scheme: GradeScheme) => void;
  refreshToken?: number;
};

export default function DivisaoNotasCard({ ano, classId, onEdit, refreshToken = 0 }: Props) {
  const [selectedBimester, setSelectedBimester] = useState<Bimestre>(1);
  const [scheme, setScheme] = useState<GradeScheme | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!classId) {
        setScheme(null);
        setErrorMessage(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchGradeScheme({ classId, year: ano });
        if (cancelled) return;
        setScheme(data);
      } catch (err: any) {
        if (cancelled) return;
        setScheme(DEFAULT_SCHEME(classId, ano));
        const msg = typeof err?.message === 'string' && err.message ? err.message : null;
        setErrorMessage(msg);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ano, classId, refreshToken]);

  const itens = useMemo(() => {
    if (!scheme) return [] as GradeSchemeItem[];
    return scheme.byBimester?.[selectedBimester]?.items ?? [];
  }, [scheme, selectedBimester]);

  const handleEdit = () => {
    if (!classId) return;
    onEdit(scheme ?? DEFAULT_SCHEME(classId, ano));
  };

  const bodyContent = (() => {
    if (!classId) {
      return <p className="text-sm text-slate-500">Cadastre uma turma para configurar a divisão de notas.</p>;
    }
    if (loading) {
      return <p className="text-sm text-slate-500">Carregando divisão de notas…</p>;
    }
    if (errorMessage) {
      return <p className="text-sm text-rose-600">{errorMessage}</p>;
    }
    if (!itens.length) {
      return (
        <p className="text-sm text-slate-500">
          Nenhum item cadastrado para este bimestre. Clique em <strong>Editar</strong> para começar.
        </p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="grade-scheme-table">
          <thead>
            <tr>
              <th className="text-left">Item</th>
              <th className="text-right">Pontos</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <SchemeRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    );
  })();

  return (
    <div className="card">
      <div className="card-header flex flex-wrap items-center justify-between gap-3">
        <h3 className="card-title">Divisão de notas</h3>
        <div className="flex flex-wrap items-center gap-2">
          {BIMESTERS.map((bim) => (
            <button
              key={bim}
              className="bimestre-pill"
              type="button"
              aria-pressed={selectedBimester === bim}
              onClick={() => setSelectedBimester(bim)}
            >
              {bim}º
            </button>
          ))}
        </div>
        <button className="btn btn-light" type="button" onClick={handleEdit} disabled={!classId}>
          Editar
        </button>
      </div>

      <div className="card-body space-y-3">{bodyContent}</div>

      <div className="card-footer text-xs text-slate-400">
        * A divisão fica visível para os alunos nos boletins e relatórios.
      </div>
    </div>
  );
}

function SchemeRow({ item }: { item: GradeSchemeItem }) {
  const name = item.name || item.label;
  const points = formatPoints(item.points);
  const badgeColor = item.color || '#FDEAD7';
  const badgeText = getReadableText(badgeColor);
  const tint = getTintColor(item.color, 0.15);

  return (
    <tr style={{ backgroundColor: tint }}>
      <td>
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-slate-800">{name || 'Sem nome'}</span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: badgeColor, color: badgeText }}
          >
            {formatType(item.type)}
          </span>
        </div>
      </td>
      <td className="text-right">
        <span className="font-semibold text-slate-900">{points} pts</span>
      </td>
    </tr>
  );
}

function formatPoints(value: number) {
  return Number(value ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatType(value: string) {
  if (!value) return 'PROVA';
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getReadableText(color: string) {
  try {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160 ? '#111' : '#fff';
  } catch {
    return '#111';
  }
}

function getTintColor(color: string, alpha = 0.12) {
  if (!color) return 'rgba(253, 234, 215, 0.35)';
  try {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return 'rgba(253, 234, 215, 0.35)';
  }
}
