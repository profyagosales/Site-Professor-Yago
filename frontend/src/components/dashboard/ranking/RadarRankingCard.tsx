import { useEffect, useMemo, useState } from "react";
import RankingToolbar, { type ToolbarState } from "./RankingToolbar";
import { fetchRankings, type RankingItem } from "@/features/radar/services";
import { DEFAULT_ENTITY, DEFAULT_METRIC, DEFAULT_TERM } from "@/features/radar/maps";

const CLASSES_PLACEHOLDER = [{ label: "Todas as turmas", value: null }]; // plug no futuro

export default function RadarRankingCard() {
  const [state, setState] = useState<ToolbarState>({
    term: DEFAULT_TERM,
    entity: DEFAULT_ENTITY,
    metric: DEFAULT_METRIC,
    classId: null
  });
  const [data, setData] = useState<RankingItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() =>
    `Top 10 do ${state.term}º bimestre — ${state.entity === "student" ? "Alunos" : state.entity === "class" ? "Turmas" : "Atividades"}`,
  [state.term, state.entity]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const items = await fetchRankings({
        term: state.term,
        entity: state.entity,
        metric: state.metric,
        classId: state.classId ?? undefined,
        limit: 10
      });
      setData(items);
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar rankings");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [state.term, state.entity, state.metric, state.classId]);

  return (
    <section className="rounded-2xl bg-white p-20 shadow-sm border">
      <header className="flex items-center justify-between mb-16">
        <h3 className="text-xl font-semibold">{title}</h3>
      </header>

      <RankingToolbar
        state={state}
        onChange={(next)=>setState(s=>({ ...s, ...next }))}
        classes={CLASSES_PLACEHOLDER}
      />

      <div className="mt-16">
        {loading && <SkeletonList />}
        {!loading && error && (
          <ErrorBlock msg={error} onRetry={load} />
        )}
        {!loading && !error && data && (
          <ol className="divide-y">
            {data.map((r, i) => (
              <li key={r.id} className="py-10 flex items-center gap-12">
                <span className="w-10 text-right tabular-nums font-semibold">{i+1}</span>
                {r.avatarUrl
                  ? <img src={r.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-neutral-200" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-8">
                    <span className="truncate">{r.name}</span>
                    {r.classLabel && (
                      <span className="px-8 py-2 rounded-full text-xs bg-neutral-100 text-neutral-700">{r.classLabel}</span>
                    )}
                  </div>
                </div>
                <span className="font-medium">{r.value.toFixed(1)}</span>
                {i < 3 && <span className="ml-8">{["🥇","🥈","🥉"][i]}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function SkeletonList() {
  return (
    <ul className="animate-pulse space-y-10">
      {Array.from({length:10}).map((_,i)=>(
        <li key={i} className="h-8 bg-neutral-100 rounded" />
      ))}
    </ul>
  );
}

function ErrorBlock({ msg, onRetry }: { msg: string; onRetry: ()=>void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-16 text-red-700">
      <p className="mb-10">Não foi possível carregar os rankings.</p>
      <pre className="text-xs opacity-70 mb-10 whitespace-pre-wrap">{msg}</pre>
      <button onClick={onRetry} className="px-12 py-6 rounded-lg bg-red-600 text-white text-sm">Tentar novamente</button>
    </div>
  );
}
