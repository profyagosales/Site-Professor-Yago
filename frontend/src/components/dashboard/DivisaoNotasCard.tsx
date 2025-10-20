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

  let bodyContent: JSX.Element;

  if (!classId) {
    bodyContent = (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
        Cadastre uma turma para configurar a divisão de notas.
      </div>
    );
  } else if (loading) {
    bodyContent = (
      <div className="flex h-full items-center justify-center px-4 text-sm text-slate-500">
        Carregando divisão de notas…
      </div>
    );
  } else if (errorMessage) {
    bodyContent = (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-rose-600">
        {errorMessage}
      </div>
    );
  } else if (!itens.length) {
    bodyContent = (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
        Nenhum item cadastrado para este bimestre. Clique em <strong>Editar</strong> para começar.
      </div>
    );
  } else {
    bodyContent = (
      <div className="pb-2">
        <table className="grade-scheme-table w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur">
            <tr>
              <th className="py-2 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Item
              </th>
              <th className="py-2 px-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pontos
              </th>
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
  }

  return (
    <section className="card h-[520px] flex flex-col lg:h-[560px] 2xl:h-[600px]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
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
        </div>
        <button className="btn btn-light" type="button" onClick={handleEdit} disabled={!classId}>
          Editar
        </button>
      </header>

      <div className="flex-none h-2" />

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">{bodyContent}</div>

      <footer className="flex-none pt-3 text-xs text-slate-400">
        * A divisão fica visível para os alunos nos boletins e relatórios.
      </footer>
    </section>
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
      <td className="py-3 px-4">
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
      <td className="py-3 px-4 text-right">
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
