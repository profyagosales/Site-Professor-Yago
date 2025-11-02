import { useEffect, useMemo, useRef } from 'react';
import { HIGHLIGHT_ALPHA, HIGHLIGHT_CATEGORIES } from '@/constants/annotations';
import { hexToRgba } from '@/utils/color';
import type { AnnotationItem } from './annotationTypes';
import { useScrollLock, type ScrollLockControls } from '@/hooks/useScrollLock';

type AnnotationSidebarProps = {
  annotations: AnnotationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCommentChange: (id: string, value: string) => void;
  focusId?: string | null;
  liveMessage?: string | null;
  className?: string;
  scrollLock?: ScrollLockControls;
};

export function AnnotationSidebar({
  annotations,
  selectedId,
  onSelect,
  onDelete,
  onCommentChange,
  focusId,
  liveMessage,
  className,
  scrollLock,
}: AnnotationSidebarProps) {
  const ordered = useMemo(
    () => [...annotations].sort((a, b) => Number(a.number) - Number(b.number)),
    [annotations]
  );
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fallbackScrollLock = useScrollLock();
  const { lock, forceUnlock } = scrollLock ?? fallbackScrollLock;

  // rAF handle to avoid overlapping animations
  const rafRef = useRef<number | null>(null);

  function smoothScrollTo(container: HTMLElement, to: number, duration = 220) {
    const start = container.scrollTop;
    const diff = to - start;
    if (Math.abs(diff) < 1) return; // ignore tiny moves
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startAt = performance.now();
    const ease = (t: number) => t * (2 - t); // easeOutQuad
    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / duration);
      container.scrollTop = start + diff * ease(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function scrollChildIntoContainer(container: HTMLElement | null, child: HTMLElement) {
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const eRect = child.getBoundingClientRect();
    const padding = 8;
    let target: number | null = null;
    const overTop = eRect.top < cRect.top;
    const overBottom = eRect.bottom > cRect.bottom;
    if (overTop) {
      target = container.scrollTop + (eRect.top - cRect.top) - padding;
    } else if (overBottom) {
      target = container.scrollTop + (eRect.bottom - cRect.bottom) + padding;
    }
    if (target !== null) {
      smoothScrollTo(container, target);
    }
  }

  useEffect(() => {
    if (!focusId) return;
    const el = textareaRefs.current[focusId];
    if (!el) return;
    try {
      // focus without scrolling the whole page
      (el as any).focus({ preventScroll: true });
    } catch {
      el.focus();
    }
    // keep caret at the end
    el.setSelectionRange(el.value.length, el.value.length);
    // scroll only the sidebar body
    scrollChildIntoContainer(containerRef.current, el);
  }, [focusId]);

  useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current[selectedId];
    if (!el) return;
    scrollChildIntoContainer(containerRef.current, el);
  }, [selectedId]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      forceUnlock();
    };
  }, [forceUnlock]);

  return (
    <aside
      className={`card RightRailCard comments-rail ws-rail ws-right-rail md:sticky md:top-[var(--hero-sticky-top,68px)] flex h-full w-full min-w-0 min-h-0 max-w-none flex-col rounded-l-none md:rounded-r-xl relative z-[2] overflow-visible p-2.5 md:p-3 m-0 md:pl-0 ${className ?? ''}`}
    >
      <div className="card-header px-0 mb-2 md:mb-2">
        <h3 className="card-title">
          Comentários ({ordered.length})
        </h3>
      </div>
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
      <div
        id="comments-rail-scroll"
        ref={containerRef}
        className="card-body comments-pane pt-0 flex-1 min-h-0 space-y-2 md:space-y-2.5 pr-1"
        style={{ scrollbarGutter: 'stable both-edges' }}
      >
        {ordered.length === 0 && (
          <p className="text-[11px] text-slate-500">
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
              ref={(node) => { itemRefs.current[ann.id] = node; }}
              data-annotation-id={ann.id}
              data-ann-id={ann.id}
              className={`rounded-md border border-slate-200 p-2.5 md:p-3 shadow-sm ${
                isActive ? 'ring-2 ring-orange-400' : ''
              }`}
              style={{
                backgroundColor: background,
                borderLeft: `2px solid ${meta?.color ?? '#E5E7EB'}`
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(ann.id)}
                aria-selected={isActive}
                aria-controls={`comment-${ann.id}`}
                className="flex w-full items-start justify-between gap-2 text-left"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-slate-600">#{ann.number}</span>
                  <h3 className="text-[11px] font-semibold text-slate-800 truncate">{meta?.label ?? 'Comentário'}</h3>
                </div>
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-700 shadow">
                  {ann.number}
                </span>
              </button>
              <textarea
                id={`comment-${ann.id}`}
                ref={(el) => {
                  textareaRefs.current[ann.id] = el;
                }}
                value={ann.comment}
                onChange={(event) => {
                  lock(2000);
                  onCommentChange(ann.id, event.target.value);
                }}
                onInput={() => {
                  lock(2000);
                }}
                onFocus={(event) => {
                  const target = event.currentTarget;
                  try {
                    target.focus({ preventScroll: true });
                  } catch {
                    /* ignore */
                  }
                  lock(2000);
                  scrollChildIntoContainer(containerRef.current, target);
                  if (selectedId !== ann.id) onSelect(ann.id);
                }}
                onBlur={() => {
                  forceUnlock();
                }}
                className="comment-textarea mt-1 w-full resize-none rounded-md border border-slate-300 bg-white p-1 text-[10px] leading-tight break-words outline-none focus:ring-2 focus:ring-orange-400 max-h-20"
                rows={2}
                placeholder="Escreva comentários detalhados aqui…"
              />
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    forceUnlock();
                    onDelete(ann.id);
                  }}
                  className="text-[10px] font-medium text-orange-600 hover:text-orange-700"
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
