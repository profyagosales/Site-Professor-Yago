import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SCHEME, fetchGradeScheme } from '@/services/gradeScheme';
import type { GradeItem, GradeScheme, Bimestre } from '@/services/gradeScheme';

const BIMESTRES: Bimestre[] = [1, 2, 3, 4];

type Props = {
  ano: number;
  onEdit: (scheme: GradeScheme) => void;
  refreshToken?: number;
};

export default function DivisaoNotasCard({ ano, onEdit, refreshToken = 0 }: Props) {
  const [selected, setSelected] = useState<Bimestre>(1);
  const [scheme, setScheme] = useState<GradeScheme>(() => DEFAULT_SCHEME(ano));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchGradeScheme(ano);
        if (!active) return;
        setScheme(data);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        // fallback seguro: não quebra a tela
        const fallback = DEFAULT_SCHEME(ano);
        setScheme(fallback);
        setError(e?.message ?? 'Não foi possível carregar a divisão de notas.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ano, refreshToken]);

  const itensPorBimestre = useMemo(() => scheme.itensPorBimestre, [scheme]);
  const itens = useMemo(() => itensPorBimestre[selected] ?? [], [itensPorBimestre, selected]);

  return (
    <section aria-labelledby="divisao-notas-title" className="card">
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
                disabled={loading}
              >
                {bimester}º
              </button>
            ))}
          </div>
          <button
            className="btn btn-outline"
            onClick={() => onEdit(scheme)}
            title="Configurar divisão de notas"
            type="button"
          >
            Editar
          </button>
        </div>
      </header>

      {error && (
        <p className="mt-2 text-sm text-rose-600" role="status">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {loading ? (
          <p className="text-slate-500">Carregando divisão de notas...</p>
        ) : itens.length ? (
          itens.map((item, index) => (
            <Badge key={item.id ?? `${selected}-${index}`} item={item} />
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

function Badge({ item }: { item: GradeItem }) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
      style={{
        background: item.cor || '#F28C2E',
        color: '#fff',
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.15)',
      }}
      title={`${item.nome} • ${item.pontos.toLocaleString('pt-BR')} pts`}
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
      {item.nome} • {item.pontos.toLocaleString('pt-BR')} pts
    </span>
  );
}
