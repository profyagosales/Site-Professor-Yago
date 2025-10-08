import React, { useEffect, useMemo, useState } from 'react';
import { getTeacherWeekAgenda, getStudentWeekAgenda, AgendaItem } from '@/services/agenda.service';

export type AgendaWeekWidgetProps = {
  scope: 'teacher' | 'student';
  entityId: string;
  start?: string; // YYYY-MM-DD
  days?: number;  // default 7
  className?: string;
};

const FEATURE_FLAG = import.meta.env.VITE_FEATURE_AGENDA_WIDGET === '1';
const DEBUG = import.meta.env.VITE_DEBUG_AGENDA === '1';

function groupByDay(items: AgendaItem[]) {
  const map: Record<string, AgendaItem[]> = {};
  for (const it of items) {
    const d = new Date(it.date);
    // UTC date key (YYYY-MM-DD)
    const key = d.toISOString().slice(0,10);
    (map[key] = map[key] || []).push(it);
  }
  // Ordenar dias asc
  return Object.entries(map)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([day, list]) => ({ day, list: list.sort((x,y) => x.date.localeCompare(y.date)) }));
}

const typeIcon: Record<AgendaItem['type'], string> = {
  content: '📄',
  evaluation: '📝',
  announcement: '📣',
};

const dayFormat: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: '2-digit' };

const AgendaWeekWidget: React.FC<AgendaWeekWidgetProps> = ({ scope, entityId, start, days = 7, className }) => {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!FEATURE_FLAG) return; // não busca se feature desligada
    if (!entityId) return;
    let abort = false;
    setLoading(true);
    setError(null);
    const fn = scope === 'teacher' ? getTeacherWeekAgenda : getStudentWeekAgenda;
    fn(entityId, { start, days })
      .then(data => { if (!abort) setItems(data || []); })
      .catch(e => { if (!abort) setError(e?.message || 'Erro ao carregar agenda'); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, [scope, entityId, start, days]);

  const grouped = useMemo(() => groupByDay(items), [items]);

  useEffect(() => {
    if (DEBUG && FEATURE_FLAG && items.length) {
      const counts = items.reduce((acc, it) => { acc[it.type] = (acc[it.type]||0)+1; return acc; }, {} as Record<string, number>);
      // eslint-disable-next-line no-console
      console.debug('[AgendaWeekWidget] counts', counts);
    }
  }, [items]);

  if (!FEATURE_FLAG) return null;

  return (
    <div className={"ys-card space-y-sm " + (className||'')}>
      <h3 className="text-orange font-semibold text-sm">Agenda da Semana</h3>
      {loading && <p className="text-xs text-black/60">Carregando...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!loading && !error && !items.length && (
        <p className="text-xs text-black/50">Nenhum item nesta semana</p>
      )}
      <div className="space-y-sm">
        {grouped.map(g => {
          const label = new Date(g.day + 'T00:00:00Z').toLocaleDateString('pt-BR', dayFormat);
          return (
            <div key={g.day} className="border rounded p-2 space-y-1 bg-white/50">
              <div className="text-[11px] uppercase tracking-wide font-semibold text-black/70">{label}</div>
              <ul className="space-y-0.5">
                {g.list.map(it => (
                  <li key={it.type + it.id} className="text-[11px] flex items-center gap-1">
                    <span>{typeIcon[it.type]}</span>
                    <span className="font-medium">{it.title || it.message}</span>
                    {it.className && <span className="text-black/50">— {it.className}</span>}
                    {it.subject && <span className="text-black/40">({it.subject})</span>}
                    {typeof it.weight === 'number' && <span className="text-black/40">[{it.weight}]</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgendaWeekWidget;
