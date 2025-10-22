import { useEffect, useMemo, useRef } from 'react';
import { HIGHLIGHT_ALPHA, HIGHLIGHT_CATEGORIES } from '@/constants/annotations';
import { hexToRgba } from '@/utils/color';
import type { AnnotationItem } from './annotationTypes';

type AnnotationSidebarProps = {
  annotations: AnnotationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCommentChange: (id: string, value: string) => void;
  focusId?: string | null;
  liveMessage?: string | null;
};

export function AnnotationSidebar({
  annotations,
  selectedId,
  onSelect,
  onDelete,
  onCommentChange,
  focusId,
  liveMessage,
}: AnnotationSidebarProps) {
  const ordered = useMemo(
    () => [...annotations].sort((a, b) => a.number - b.number),
    [annotations]
  );
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    if (!focusId) return;
    const el = textareaRefs.current[focusId];
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusId]);

  return (
    <aside className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h2 className="text-base font-semibold">Comentários ({ordered.length})</h2>
      </div>
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-2">
        {ordered.length === 0 && (
          <p className="text-sm text-slate-500">
            Selecione um trecho no PDF para adicionar um comentário.
          </p>
        )}
        {ordered.map((ann) => {
          const meta = HIGHLIGHT_CATEGORIES[ann.category];
          const isActive = ann.id === selectedId;
          const background =
            meta?.color ? hexToRgba(meta.color, HIGHLIGHT_ALPHA * 0.75) : hexToRgba('#F3F4F6', 0.8);
          return (
            <div
              key={ann.id}
              className={`rounded-lg border border-slate-200 p-3 shadow-sm ${
                isActive ? 'ring-2 ring-orange-400' : ''
              }`}
              style={{ backgroundColor: background }}
            >
              <button
                type="button"
                onClick={() => onSelect(ann.id)}
                className="flex w-full items-start justify-between text-left"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-600">#{ann.number}</span>
                  <h3 className="text-sm font-semibold text-slate-800">{meta?.label ?? 'Comentário'}</h3>
                  <p className="text-xs text-slate-600">página {ann.page}</p>
                </div>
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 shadow">
                  {ann.number}
                </span>
              </button>
              <textarea
                ref={(el) => {
                  textareaRefs.current[ann.id] = el;
                }}
                value={ann.comment}
                onChange={(event) => onCommentChange(ann.id, event.target.value)}
                onFocus={() => onSelect(ann.id)}
                className="mt-2 w-full resize-none rounded-md border border-slate-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                rows={3}
                placeholder="Escreva comentários detalhados aqui…"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onDelete(ann.id)}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default AnnotationSidebar;
