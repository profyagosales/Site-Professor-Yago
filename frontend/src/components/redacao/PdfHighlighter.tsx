import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { PdfLoader, PdfHighlighter as RPH, Highlight, Popup } from 'react-pdf-highlighter';

export interface HighlightItem {
  id: string;
  color: string;
  comment: string;
  selection: any;
  bbox: { page: number; x: number; y: number; w: number; h: number };
}

interface Props {
  pdfUrl: string;
  highlights: HighlightItem[];
  onChange: (h: HighlightItem[]) => void;
  onPageChange?: (p:number) => void;
}

export interface PdfHighlighterHandle {
  jumpToPage: (p:number) => void;
}

const COLORS: Record<string,string> = {
  yellow: 'rgba(253, 224, 71, 0.4)',
  red: 'rgba(239, 68, 68, 0.4)',
  blue: 'rgba(59, 130, 246, 0.4)'
};

function PdfHighlighter({ pdfUrl, highlights, onChange, onPageChange }: Props, ref: any) {
  const [active, setActive] = useState<'yellow'|'red'|'blue'>('yellow');
  const scrollRef = useRef<any>(null);
  const viewerRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    jumpToPage(page: number) {
      const target = highlights.find(h => h.bbox.page === page);
      if (target && scrollRef.current) scrollRef.current(target);
    }
  }), [highlights]);

  function handleSelection(position:any, content:any) {
    const text = window.prompt('Comentário') || '';
    const id = Math.random().toString(36).slice(2);
    const { pageNumber, boundingRect } = position;
    const bbox = {
      page: pageNumber,
      x: boundingRect.x1,
      y: boundingRect.y1,
      w: boundingRect.x2 - boundingRect.x1,
      h: boundingRect.y2 - boundingRect.y1
    };
    onChange([...highlights, { id, color: active, comment: text, selection: { position, content }, bbox }]);
  }

  function highlightTransform(h: HighlightItem, _idx: number, setTip: any, hideTip: any, _t: any, _s: any, isScrolledTo: boolean) {
    const inner = (
      <Highlight
        key={h.id}
        isScrolledTo={isScrolledTo}
        position={h.selection.position}
        comment={{ text: h.comment }}
        highlightStyle={{ background: COLORS[h.color] || COLORS.yellow }}
      />
    );
    return (
      <Popup
        key={h.id}
        popupContent={<div className="p-1 text-xs">{h.comment}</div>}
        onMouseOver={() => setTip(<div className="p-1 text-xs">{h.comment}</div>)}
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
    <div className="h-full flex flex-col">
      <div className="flex gap-2 p-2 border-b">
        {(['yellow','red','blue'] as const).map(c => (
          <button
            key={c}
            className={`h-6 w-6 rounded ${active===c? 'ring-2 ring-black':''}`}
            style={{ background: COLORS[c] }}
            onClick={()=>setActive(c)}
          />
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <PdfLoader url={pdfUrl} beforeLoad={<div className="p-4 text-sm">Carregando…</div>}>
          {(doc) => (
            <RPH
              pdfDocument={doc}
              ref={viewerRef}
              scrollRef={(scrollTo) => { scrollRef.current = scrollTo; }}
              onScrollChange={onScroll}
              enableAreaSelection={() => true}
              onSelectionFinished={(position, content, hide, _tr) => {
                handleSelection(position, content);
                hide();
              }}
              highlightTransform={highlightTransform}
              highlights={highlights}
            />
          )}
        </PdfLoader>
      </div>
    </div>
  );
}

export default forwardRef(PdfHighlighter);
