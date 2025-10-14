import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { HIGHLIGHT_PALETTE } from './palette';
import type { Highlight } from './types';
import { Button } from '@/components/ui/Button';

interface Props {
  fileUrl: string;
  highlights: Highlight[];
  onChange: (h: Highlight[]) => void;
  onPageChange?: (p: number) => void;
  requireComment?: boolean;
}

export interface PdfHighlighterHandle {
  jumpToPage: (p: number) => void;
}

// Lazy-load control: importa somente quando o componente realmente renderiza
// e impede o pré-carregamento do bundle via /* @vite-ignore */.
const LazyPdfLoader = React.lazy(async () => {
  const m: any = await import(/* @vite-ignore */ 'react-pdf-highlighter');
  return { default: m.PdfLoader as React.ComponentType<any> };
});

const LazyRPH = React.lazy(async () => {
  const m: any = await import(/* @vite-ignore */ 'react-pdf-highlighter');
  return { default: m.PdfHighlighter as React.ComponentType<any> };
});

const LazyHighlight = React.lazy(async () => {
  const m: any = await import(/* @vite-ignore */ 'react-pdf-highlighter');
  return { default: m.Highlight as React.ComponentType<any> };
});

const LazyPopup = React.lazy(async () => {
  const m: any = await import(/* @vite-ignore */ 'react-pdf-highlighter');
  return { default: m.Popup as React.ComponentType<any> };
});

const PdfHighlighter = forwardRef<PdfHighlighterHandle, Props>(
  (
    {
      fileUrl,
      highlights,
      onChange,
      onPageChange,
      requireComment = true,
    },
    ref,
  ) => {
    const COLORS = Object.fromEntries(
      HIGHLIGHT_PALETTE.map((p) => [p.id, p.fill]),
    ) as Record<string, string>;
    const [active, setActive] = useState<string>(HIGHLIGHT_PALETTE[0]?.id || '');
    const scrollRef = useRef<any>(null);
    const viewerRef = useRef<any>(null);
    const [modal, setModal] = useState<{
      position: any;
      content: any;
      hide: () => void;
    } | null>(null);
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');

    useImperativeHandle(
      ref,
      () => ({
        jumpToPage(page: number) {
          // @ts-expect-error bbox sempre presente para destaques existentes
          const target = highlights.find((h) => h.bbox.page === page);
          if (target && scrollRef.current) scrollRef.current(target);
        },
      }),
      [highlights],
    );

    function handleSelection(position: any, content: any, hide: () => void) {
      setModal({ position, content, hide });
      setTitle('');
      setText('');
    }

    function saveModal() {
      if (!modal) return;
      if (requireComment && (!title.trim() || !text.trim())) return;
      const id = Math.random().toString(36).slice(2);
      const { position, content, hide } = modal;
      const { pageNumber, boundingRect } = position;
      const bbox = {
        page: pageNumber,
        x: boundingRect.x1,
        y: boundingRect.y1,
        w: boundingRect.x2 - boundingRect.x1,
        h: boundingRect.y2 - boundingRect.y1,
      };
      const paletteItem = HIGHLIGHT_PALETTE.find(p => p.id === active)!;
      onChange([
        ...highlights,
        {
          id,
          pageNumber,
          rects: [{ left: bbox.x, top: bbox.y, width: bbox.w, height: bbox.h }],
          color: paletteItem.hex,
          fill: paletteItem.fill,
          category: paletteItem.id,
          label: paletteItem.label,
          comment: text,
          createdAt: new Date().toISOString(),
          author: null,
          selection: { position, content },
          bbox,
        } as any,
      ]);
      hide();
      setModal(null);
    }

    function highlightTransform(
      h: Highlight,
      _idx: number,
      setTip: any,
      hideTip: any,
      _t: any,
      _s: any,
      isScrolledTo: boolean,
    ) {
      const lbl = h.label || '';
      const inner = (
        <LazyHighlight
          key={h.id}
          isScrolledTo={isScrolledTo}
          position={h.selection.position}
          comment={{ text: lbl ? `${lbl}: ${h.comment}` : h.comment }}
          highlightStyle={{ background: h.fill || COLORS[h.category] }}
        />
      );
      const popup = (
        <div className="p-1 text-xs">
          {lbl && <div className="font-medium">{lbl}</div>}
          <div>{h.comment}</div>
        </div>
      );
      return (
        <LazyPopup
          key={h.id}
          popupContent={popup}
          onMouseOver={() => setTip(popup)}
          onMouseOut={hideTip}
        >
          {inner}
        </LazyPopup>
      );
    }

    function onScroll() {
      const container = viewerRef.current?.containerNode;
      if (!container) return;
      const pages = Array.from(
        container.querySelectorAll('.page'),
      ) as HTMLElement[];
      const top = container.scrollTop;
      let page = 1;
      for (const p of pages) {
        if (top >= p.offsetTop - 1)
          page = Number(p.dataset.pageNumber || 1);
      }
      if (onPageChange) onPageChange(page);
    }

    return (
      <React.Suspense fallback={null}>
        {fileUrl ? (
          <>
            <div className="h-full flex flex-col">
              <div className="flex gap-2 p-2 border-b">
                <div role="radiogroup" className="flex gap-2">
                  {HIGHLIGHT_PALETTE.map((p, idx) => (
                    <button
                      role="radio"
                      key={p.id}
                      aria-label={p.label}
                      title={`${p.label} (${idx + 1})`}
                      className={`h-5 w-5 rounded-[6px] border ${active === p.id ? 'ring-2 ring-black' : ''}`}
                      style={{ background: p.fill }}
                      onClick={() => setActive(p.id)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <LazyPdfLoader
                  url={fileUrl as any}
                  beforeLoad={<div className="p-4 text-sm">Carregando…</div>}
                >
                  {(doc: any) => (
                    <LazyRPH
                      pdfDocument={doc}
                      ref={viewerRef}
                      scrollRef={(scrollTo: any) => {
                        scrollRef.current = scrollTo;
                      }}
                      onScrollChange={onScroll}
                      enableAreaSelection={() => true}
                      onSelectionFinished={(position: any, content: any, hide: any) => {
                        handleSelection(position, content, hide);
                      }}
                      highlightTransform={highlightTransform}
                      highlights={highlights}
                    />
                  )}
                </LazyPdfLoader>
              </div>
            </div>
            {modal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="w-full max-w-sm rounded bg-white p-4 shadow-lg">
                  <h3 className="mb-2 text-lg font-medium">Novo comentário</h3>
                  <input
                    className="mb-2 w-full rounded border p-2 text-sm"
                    placeholder="Título"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <textarea
                    className="mb-2 w-full rounded border p-2 text-sm"
                    placeholder="Texto"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        modal.hide();
                        setModal(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveModal}
                      disabled={requireComment && (!title || !text)}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </React.Suspense>
    );
  },
);

export default PdfHighlighter;

