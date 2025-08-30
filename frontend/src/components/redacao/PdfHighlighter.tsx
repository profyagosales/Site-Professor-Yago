import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { PdfLoader, PdfHighlighter as RPH, Highlight, Popup } from 'react-pdf-highlighter';

export interface HighlightItem {
  id: string;
  color: string;
  label?: string;
  comment: string;
  selection: any;
  bbox: { page: number; x: number; y: number; w: number; h: number };
}

type PaletteItem = { id: string; color: string; label: string };

interface Props {
  pdfUrl: string;
  highlights: HighlightItem[];
  onChange: (h: HighlightItem[]) => void;
  onPageChange?: (p:number) => void;
  palette?: PaletteItem[];
  requireComment?: boolean;
  token?: string;
}

export interface PdfHighlighterHandle {
  jumpToPage: (p:number) => void;
}

const DEFAULT_PALETTE: PaletteItem[] = [
  { id: 'grammar', color: '#86EFAC99', label: 'Ortografia/Gramática' },
  { id: 'cohesion', color: '#FDE68A99', label: 'Coesão/Coerência' },
  { id: 'argument', color: '#93C5FD99', label: 'Argumentação/Conteúdo' },
];

function PdfHighlighter({ pdfUrl, highlights, onChange, onPageChange, palette = DEFAULT_PALETTE, requireComment = true, token }: Props, ref: any) {
  const COLORS = Object.fromEntries(palette.map(p => [p.id, p.color])) as Record<string, string>;
  const [active, setActive] = useState<string>(palette[0]?.id || '');
  const scrollRef = useRef<any>(null);
  const viewerRef = useRef<any>(null);
  const [modal, setModal] = useState<{
    position: any;
    content: any;
    hide: () => void;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  useImperativeHandle(ref, () => ({
    jumpToPage(page: number) {
      const target = highlights.find(h => h.bbox.page === page);
      if (target && scrollRef.current) scrollRef.current(target);
    }
  }), [highlights]);

  function handleSelection(position:any, content:any, hide: () => void) {
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
    onChange([
      ...highlights,
      { id, color: active, label: title, comment: text, selection: { position, content }, bbox },
    ]);
    hide();
    setModal(null);
  }

  function highlightTransform(
    h: HighlightItem,
    _idx: number,
    setTip: any,
    hideTip: any,
    _t: any,
    _s: any,
    isScrolledTo: boolean,
  ) {
    const lbl = h.label || '';
    const inner = (
      <Highlight
        key={h.id}
        isScrolledTo={isScrolledTo}
        position={h.selection.position}
        comment={{ text: lbl ? `${lbl}: ${h.comment}` : h.comment }}
        highlightStyle={{ background: COLORS[h.color] || palette[0]?.color }}
      />
    );
    const popup = (
      <div className="p-1 text-xs">
        {lbl && <div className="font-medium">{lbl}</div>}
        <div>{h.comment}</div>
      </div>
    );
    return (
      <Popup
        key={h.id}
        popupContent={popup}
        onMouseOver={() => setTip(popup)}
        onMouseOut={hideTip}
      >
        {inner}
      </Popup>
    );
  }

  function onScroll() {
    const container = viewerRef.current?.containerNode;
    if (!container) return;
    const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    const top = container.scrollTop;
    let page = 1;
    for (const p of pages) {
      if (top >= p.offsetTop - 1) page = Number(p.dataset.pageNumber || 1);
    }
    if (onPageChange) onPageChange(page);
  }

  return (
    <>
    <div className="h-full flex flex-col">
      <div className="flex gap-2 p-2 border-b">
        {palette.map(p => (
          <button
            key={p.id}
            aria-label={p.label}
            title={p.label}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${active===p.id? 'ring-2 ring-black':''}`}
            onClick={()=>setActive(p.id)}
          >
            <span className="h-4 w-4 rounded" style={{ background: p.color }} />
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <PdfLoader url={{ url: pdfUrl, httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined, withCredentials: true } as any} beforeLoad={<div className="p-4 text-sm">Carregando…</div>}>
          {(doc) => (
            <RPH
              pdfDocument={doc}
              ref={viewerRef}
              scrollRef={(scrollTo) => { scrollRef.current = scrollTo; }}
              onScrollChange={onScroll}
              enableAreaSelection={() => true}
              onSelectionFinished={(position, content, hide) => {
                handleSelection(position, content, hide);
              }}
              highlightTransform={highlightTransform}
              highlights={highlights}
            />
          )}
        </PdfLoader>
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
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={() => {
                modal.hide();
                setModal(null);
              }}
            >
              Cancelar
            </button>
            <button
              className="rounded bg-orange-500 px-3 py-1 text-sm text-white disabled:opacity-60"
              disabled={requireComment && (!title || !text)}
              onClick={saveModal}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default forwardRef(PdfHighlighter);
