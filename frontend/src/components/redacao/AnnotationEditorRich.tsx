import { useEffect, useMemo, useRef } from 'react';
import type { Anno } from '@/types/annotations';

type Props = {
  value: Anno[];
  onChange: (next: Anno[]) => void;
  currentPage: number;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
  onJump?: (page: number) => void;
};

export default function AnnotationEditorRich({ value, onChange, currentPage, onSelect, selectedId, onJump }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const pageItems = useMemo(() => value.filter(a=> a.page === currentPage), [value, currentPage]);
  const byPage = useMemo(() => groupBy(value, a=> a.page), [value]);

  useEffect(() => {
    if (!selectedId) return;
    const el = listRef.current?.querySelector(`[data-id="${selectedId}"]`);
    (el as HTMLElement | null)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  function remove(id: string) {
    onChange(value.filter(a=> a.id !== id));
    if (selectedId === id) onSelect(null);
  }
  function clearPage() {
    onChange(value.filter(a=> a.page !== currentPage));
    if (selectedId && value.find(a=> a.id===selectedId)?.page === currentPage) onSelect(null);
  }

  return (
    <div className="rounded-lg border border-[#E5E7EB]">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-sm font-medium">Anotações</div>
        <div className="text-xs text-ys-ink-2">Pág. {currentPage} • {pageItems.length}</div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <button className="rounded border px-2 py-1" onClick={clearPage} disabled={pageItems.length===0}>Limpar pág.</button>
        <button className="rounded border px-2 py-1" onClick={()=>{
          const pages = Object.keys(byPage).map(n=> Number(n)).sort((a,b)=>a-b);
          const i = pages.findIndex(p=> p>currentPage);
          const next = i>=0 ? pages[i] : pages[0];
          if (next) onJump?.(next);
        }} disabled={value.length===0}>Próxima com anotação</button>
      </div>
      <div className="max-h-64 overflow-auto px-2 pb-2" ref={listRef}>
        {pageItems.length===0 && (
          <div className="px-3 py-6 text-center text-xs text-ys-ink-2">Nenhuma anotação nesta página</div>
        )}
        {pageItems.map((a)=> (
          <div key={a.id} data-id={a.id} className={`group mb-1 flex items-start justify-between rounded p-2 text-sm ${selectedId===a.id?'bg-[#FFF7ED]':'hover:bg-[#F3F4F6]'}`} onClick={()=> onSelect(a.id)}>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="inline-block h-5 w-5 text-center text-xs">
                {iconFor(a.type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{labelFor(a)}</div>
                {a.type==='comment' && (
                  <input className="mt-1 w-full rounded border px-2 py-1 text-xs" value={a.text} onChange={(e)=>{
                    const next = value.slice(); const i = next.findIndex(x=> x.id===a.id); (next[i] as any).text = e.target.value; onChange(next);
                  }} placeholder="Comentário" />
                )}
              </div>
            </div>
            <button className="invisible ml-2 rounded border px-2 py-1 text-xs group-hover:visible" onClick={(ev)=>{ ev.stopPropagation(); remove(a.id); }}>Excluir</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function iconFor(t: Anno['type']) {
  switch (t) {
    case 'highlight': return '🖍️';
    case 'box': return '⬚';
    case 'pen': return '✏️';
    case 'strike': return '／';
    case 'comment': return '💬';
  }
}
function labelFor(a: Anno) {
  switch (a.type) {
    case 'highlight': return 'Destaque';
    case 'box': return 'Caixa';
    case 'pen': return 'Rabisco';
    case 'strike': return 'Risco';
    case 'comment': return a.text || 'Comentário';
  }
}
function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}
