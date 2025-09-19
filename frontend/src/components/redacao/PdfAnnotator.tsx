import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Stage, Layer, Rect, Line, Text, Group } from "react-konva";
import { nanoid } from "nanoid";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export type PaletteItem = { key:string; label:string; color:string; rgba:string; };
type RectNorm = { x:number; y:number; w:number; h:number };
type PenPath = { points:number[]; width:number };
export type AnnHighlight = {
  id:string;
  type:"highlight"|"strike"|"box"|"pen"|"comment";
  page:number;
  color:string;
  category?:string;
  comment?:string;
  rects?: RectNorm[];      // highlight/strike
  box?: RectNorm;          // box
  pen?: PenPath;           // pen
  at?: { x:number; y:number }; // comment pin
  createdAt:number;
};

export default function PdfAnnotator({
  fileSrc,
  essayId,
  palette,
  onChange,
}: {
  fileSrc: string;
  essayId: string;
  palette: PaletteItem[];
  onChange?: (annos: AnnHighlight[]) => void;
}) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<"highlight"|"strike"|"box"|"pen"|"comment">("highlight");
  const [currentCat, setCurrentCat] = useState<PaletteItem>(palette[1] /* verde */);
  const [annos, setAnnos] = useState<AnnHighlight[]>([]);
  const [pageSizes, setPageSizes] = useState<{[p:number]: {w:number; h:number}}>({});

  const toNorm = (r:{x:number;y:number;width:number;height:number}, w:number, h:number):RectNorm =>
    ({ x: r.x / w, y: r.y / h, w: r.width / w, h: r.height / h });
  const fromNorm = (r:RectNorm, w:number, h:number) =>
    ({ x: r.x * w, y: r.y * h, width: r.w * w, height: r.h * h });

  const emit = (list:AnnHighlight[]) => { setAnnos(list); onChange?.(list); };

  const Toolbar = () => (
    <div className="flex items-center gap-2 pb-2 border-b">
      <div className="flex gap-1">
        {(["highlight","strike","box","pen","comment"] as const).map(t => (
          <button
            key={t}
            onClick={()=>setTool(t)}
            className={`px-2 py-1 rounded ${tool===t?'bg-orange-100 text-orange-700':'bg-muted'}`}
            title={t}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-1 ml-3">
        {palette.map(p => (
          <button key={p.key}
            onClick={()=>setCurrentCat(p)}
            style={{ background:p.rgba }}
            className={`px-2 py-1 rounded border ${currentCat.key===p.key?'ring-2 ring-orange-500':''}`}
            title={p.label}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex gap-2">
        <button onClick={()=>setScale(s=>Math.max(0.75, s-0.1))} className="px-2 py-1 rounded border">–</button>
        <span className="px-2 py-1">{Math.round(scale*100)}%</span>
        <button onClick={()=>setScale(s=>Math.min(2, s+0.1))} className="px-2 py-1 rounded border">+</button>
      </div>
    </div>
  );

  function PageOverlay({page}:{page:number}) {
    const size = pageSizes[page];
    const [drag, setDrag] = useState<{x:number;y:number;width:number;height:number}|null>(null);
    if (!size) return null;

    const onDown = (e:any) => {
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;
      if (tool==="pen") {
        const id = nanoid();
        const pen: AnnHighlight = { id, type:"pen", page, color: currentCat.color, category: currentCat.key, pen:{ points:[pos.x,pos.y], width:2 }, createdAt: Date.now() };
        emit([...annos, pen]);
        return;
      }
      if (tool==="comment") {
        const id = nanoid();
        const pin: AnnHighlight = { id, type:"comment", page, color: currentCat.color, category: currentCat.key, at:{ x: pos.x/size.w, y: pos.y/size.h }, createdAt: Date.now(), comment: currentCat.label };
        emit([...annos, pin]);
        return;
      }
      setDrag({ x: pos.x, y: pos.y, width: 0, height: 0 });
    };

    const onMove = (e:any) => {
      if (!drag) {
        if (tool==="pen") {
          const pos = e.target.getStage().getPointerPosition();
          if (!pos) return;
          emit(annos.map(a=>{
            if (a.type==="pen" && a.page===page && a.pen) {
              a.pen.points = [...a.pen.points!, pos.x, pos.y];
            }
            return a;
          }));
        }
        return;
      }
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;
      setDrag(prev => prev ? ({ ...prev, width: pos.x - prev.x, height: pos.y - prev.y }) : null);
    };

    const onUp = () => {
      if (drag) {
        const rect = {
          x: Math.min(drag.x, drag.x+drag.width),
          y: Math.min(drag.y, drag.y+drag.height),
          width: Math.abs(drag.width),
          height: Math.abs(drag.height),
        };
        const id = nanoid();
        if (tool==="box") {
          const a: AnnHighlight = { id, type:"box", page, color: currentCat.color, category: currentCat.key, box: toNorm(rect, size.w, size.h), createdAt: Date.now(), comment: currentCat.label };
          emit([...annos, a]);
        } else {
          const a: AnnHighlight = { id, type: tool, page, color: currentCat.color, category: currentCat.key, rects: [toNorm(rect, size.w, size.h)], createdAt: Date.now(), comment: currentCat.label };
          emit([...annos, a]);
        }
        setDrag(null);
      }
    };

    const annsThis = annos.filter(a=>a.page===page);

    return (
      <Stage width={size.w} height={size.h} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}>
        <Layer>
          {annsThis.map(a=>{
            if (a.type==="highlight" && a.rects) return a.rects.map((r,i)=>{
              const d = fromNorm(r, size.w, size.h);
              return <Rect key={a.id+"_"+i} x={d.x} y={d.y} width={d.width} height={d.height} fill={currentCat.rgba} opacity={0.6} cornerRadius={3} />;
            });
            if (a.type==="strike" && a.rects) return a.rects.map((r,i)=>{
              const d = fromNorm(r, size.w, size.h);
              return <Line key={a.id+"_"+i} points={[d.x, d.y+d.height/2, d.x+d.width, d.y+d.height/2]} stroke={a.color} strokeWidth={2} />;
            });
            if (a.type==="box" && a.box) {
              const d = fromNorm(a.box, size.w, size.h);
              return <Rect key={a.id} x={d.x} y={d.y} width={d.width} height={d.height} stroke={a.color} strokeWidth={2} dash={[6,4]} />;
            }
            if (a.type==="pen" && a.pen) {
              return <Line key={a.id} points={a.pen.points!} stroke={a.color} strokeWidth={a.pen.width||2} lineCap="round" lineJoin="round" />;
            }
            if (a.type==="comment" && a.at) {
              const d = { x: a.at.x*size.w, y: a.at.y*size.h };
              return (
                <Group key={a.id}>
                  <Text x={d.x} y={d.y} text="✦" fontSize={16} fill={a.color} />
                </Group>
              );
            }
            return null;
          })}
          {drag && <Rect x={Math.min(drag.x, drag.x+drag.width)} y={Math.min(drag.y, drag.y+drag.height)} width={Math.abs(drag.width)} height={Math.abs(drag.height)} stroke={currentCat.color} dash={[4,3]} />}
        </Layer>
      </Stage>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div className="mb-2">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="flex gap-1">
            {(["highlight","strike","box","pen","comment"] as const).map(t => (
              <button
                key={t}
                onClick={()=>setTool(t)}
                className={`px-2 py-1 rounded ${tool===t?'bg-orange-100 text-orange-700':'bg-muted'}`}
                title={t}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-3">
            {palette.map(p => (
              <button key={p.key}
                onClick={()=>setCurrentCat(p)}
                style={{ background:p.rgba }}
                className={`px-2 py-1 rounded border ${currentCat.key===p.key?'ring-2 ring-orange-500':''}`}
                title={p.label}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={()=>setScale(s=>Math.max(0.75, s-0.1))} className="px-2 py-1 rounded border">–</button>
            <span className="px-2 py-1">{Math.round(scale*100)}%</span>
            <button onClick={()=>setScale(s=>Math.min(2, s+0.1))} className="px-2 py-1 rounded border">+</button>
          </div>
        </div>
      </div>

      {/* páginas */}
      <div className="mt-1 space-y-8 overflow-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
        <Document
          file={fileSrc}
          loading={<div className="p-4 text-muted-foreground">Carregando PDF…</div>}
          error={<div className="p-4 text-destructive">Falha ao carregar PDF</div>}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {Array.from(new Array(numPages), (_, i) => (
            <div key={i+1} className="relative inline-block">
              <Page
                pageNumber={i+1}
                scale={scale}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                onLoadSuccess={(p:any)=>{
                  // tamanhos renderizados (usados pelo overlay)
                  const vw = p._pageInfo.view[2] * scale;
                  const vh = p._pageInfo.view[3] * scale;
                  setPageSizes(s => ({ ...s, [i+1]: { w: vw, h: vh } }));
                }}
              />
              {/* overlay */}
              {pageSizes[i+1] && (
                <div className="absolute inset-0 pointer-events-auto">
                  <PageOverlay page={i+1}/>
                </div>
              )}
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
