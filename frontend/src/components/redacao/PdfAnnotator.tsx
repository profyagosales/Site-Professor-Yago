import type React from "react";
import { useEffect, useRef, useState, useMemo } from "react";
import { nanoid } from "nanoid";
import { emitPdfEvent } from '@/services/telemetry.service';
import { ensureWorker } from '@/lib/pdf';

/** NÃO importar 'react-pdf' nem 'react-konva' no topo — são carregados dinamicamente. */

export type PaletteItem = { key: string; label: string; color: string; rgba: string };

type RectNorm = { x: number; y: number; w: number; h: number };
type PenPath = { points: number[]; width: number };

export type AnnHighlight = {
  id: string;
  type: "highlight" | "strike" | "box" | "pen" | "comment";
  page: number;
  color: string;
  category?: string;
  comment?: string;
  rects?: RectNorm[]; // highlight/strike
  box?: RectNorm; // box
  pen?: PenPath; // pen
  at?: { x: number; y: number }; // comment pin
  createdAt: number;
  number?: number;
};

export type PdfAnnotatorProps = {
  fileUrl: string | null;
  essayId: string;
  palette: PaletteItem[];
  onChange?: (annos: AnnHighlight[]) => void;
  onError?: (error: unknown) => void;
  hideLocalToolbar?: boolean;
};

export default function PdfAnnotator({
  fileUrl,
  essayId,
  palette,
  onChange,
  onError,
  hideLocalToolbar = false,
}: PdfAnnotatorProps) {
  /** --------- lazy import das libs --------- */
  const [RP, setRP] = useState<any>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const m = await import(/* @vite-ignore */ "react-pdf");
        try {
          const w = new Worker("/pdf.worker.min.mjs", { type: "module" });
          (m.pdfjs.GlobalWorkerOptions as any).workerPort = w as any;
        } catch {
          m.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        }
        try { ensureWorker(); } catch {}
        if (active) setRP(m);
      } catch (e) {
        console.error("Falha ao carregar react-pdf", e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const [RK, setRK] = useState<any>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const m = await import(/* @vite-ignore */ "react-konva");
        if (active) setRK(m);
      } catch (e) {
        console.error("Falha ao carregar react-konva", e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** --------- estados e helpers --------- */
  const [numPages, setNumPages] = useState<number>(0);
  // Safe-Mode: começar só com a 1ª página e liberar as demais sob demanda
  const [safeMode, setSafeMode] = useState<boolean>(() => ((import.meta as any).env?.VITE_PDF_SAFE_MODE === '1'));
  const [pagesGateOpen, setPagesGateOpen] = useState<boolean>(false);
  const pagesToRender = (safeMode && !pagesGateOpen) ? Math.min(1, numPages || 1) : numPages;
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<"highlight" | "strike" | "box" | "pen" | "comment">("highlight");
  const [currentCat, setCurrentCat] = useState<PaletteItem>(palette[1] ?? palette[0]);
  const [annos, setAnnos] = useState<AnnHighlight[]>([]);
  // Mapa id -> ordem (#n) estável por createdAt
  const orderMap = useMemo(() => {
    const sorted = [...annos].sort((a, b) => (a.createdAt - b.createdAt) || a.id.localeCompare(b.id));
    const map: Record<string, number> = {};
    sorted.forEach((a, i) => { map[a.id] = i + 1; });
    return map;
  }, [annos]);
  const [pageSizes, setPageSizes] = useState<Record<number, { w: number; h: number }>>({});
  const PDF_DEBUG = (import.meta as any).env?.VITE_PDF_DEBUG === '1';

  const printing = typeof document !== 'undefined' && document.documentElement.getAttribute('data-printing') === '1';

  // Fit-width control per page
  const pageWrapRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [pageWidths, setPageWidths] = useState<Record<number, number>>({});

  function debounce<T extends (...args: any[]) => void>(fn: T, wait = 150) {
    let t: any;
    return (...args: Parameters<T>) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  useEffect(() => {
    const update = () => {
      const next: Record<number, number> = {};
      for (let p = 1; p <= pagesToRender; p++) {
        const el = pageWrapRefs.current[p];
        if (!el) continue;
        const w = el.clientWidth || el.getBoundingClientRect().width || 0;
        if (w > 0) next[p] = Math.floor(w);
      }
      if (Object.keys(next).length) setPageWidths(next);
    };
    const onResize = debounce(update, 150);
    update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pagesToRender]);

  const emit = (list: AnnHighlight[]) => {
    setAnnos(list);
    onChange?.(list);
  };

  const toNorm = (r: { x: number; y: number; width: number; height: number }, w: number, h: number): RectNorm => ({
    x: r.x / w,
    y: r.y / h,
    w: r.width / w,
    h: r.height / h,
  });
  const fromNorm = (r: RectNorm, w: number, h: number) => ({ x: r.x * w, y: r.y * h, width: r.w * w, height: r.h * h });
  useEffect(() => {
    if (!fileUrl) return;
    emitPdfEvent('pdf_load_success', {
      essayId,
      step: 'prepared-url',
      srcType: fileUrl.startsWith('blob:') ? 'blob' : 'url',
    });
  }, [essayId, fileUrl]);



  /** --------- lib components (após lazy) --------- */
  if (!RP) return <div className="p-4 text-muted-foreground">Carregando visualizador…</div>;
  if (!RK) return <div className="p-4 text-muted-foreground">Carregando ferramentas…</div>;

  const { Document, Page } = RP as any;
  const Stage: React.ComponentType<any> = (RK as any).Stage;
  const Layer: React.ComponentType<any> = (RK as any).Layer;
  const Rect: React.ComponentType<any> = (RK as any).Rect;
  const Line: React.ComponentType<any> = (RK as any).Line;
  const Group: React.ComponentType<any> = (RK as any).Group;
  const Text: React.ComponentType<any> = (RK as any).Text;

  /** --------- toolbar --------- */
  const Toolbar = () => (
    <div className="flex items-center gap-2 pb-2 border-b">
      <div className="flex gap-1">
        {(["highlight", "strike", "box", "pen", "comment"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            className={`px-2 py-1 rounded ${tool === t ? "bg-orange-100 text-orange-700" : "bg-muted"}`}
            title={t}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-1 ml-3">
        {palette.map((p) => (
          <button
            key={p.key}
            onClick={() => setCurrentCat(p)}
            style={{ background: p.rgba }}
            className={`px-2 py-1 rounded border ${currentCat.key === p.key ? "ring-2 ring-orange-500" : ""}`}
            title={p.label}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-1">Ajuste automático (largura)</span>
      </div>
    </div>
  );

  /** --------- overlay por página --------- */
  function PageOverlay({ page }: { page: number }) {
    const size = pageSizes[page];
    const [drag, setDrag] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    if (!size) return null;
    const colorForAnno = (a: AnnHighlight) => {
      const p = palette.find((x) => x.key === a.category) || palette[0];
      return p;
    };

    const onDown = (e: any) => {
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      if (tool === "pen") {
        const id = nanoid();
        const pen: AnnHighlight = {
          id,
          type: "pen",
          page,
          color: currentCat.color,
          category: currentCat.key,
          pen: { points: [pos.x, pos.y], width: 2 },
          createdAt: Date.now(),
        };
        emit([...annos, pen]);
        return;
      }

      if (tool === "comment") {
        const id = nanoid();
        const pin: AnnHighlight = {
          id,
          type: "comment",
          page,
          color: currentCat.color,
          category: currentCat.key,
          at: { x: pos.x / size.w, y: pos.y / size.h },
          createdAt: Date.now(),
          comment: currentCat.label,
        };
        emit([...annos, pin]);
        return;
      }

      setDrag({ x: pos.x, y: pos.y, width: 0, height: 0 });
    };

    const onMove = (e: any) => {
      if (!drag) {
        if (tool === "pen") {
          const pos = e.target.getStage().getPointerPosition();
          if (!pos) return;
          emit(
            annos.map((a) => {
              if (a.type === "pen" && a.page === page && a.pen) {
                a.pen.points = [...a.pen.points!, pos.x, pos.y];
              }
              return a;
            })
          );
        }
        return;
      }
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;
      setDrag((prev) => (prev ? { ...prev, width: pos.x - prev.x, height: pos.y - prev.y } : null));
    };

    const onUp = () => {
      if (!drag) return;

      const rect = {
        x: Math.min(drag.x, drag.x + drag.width),
        y: Math.min(drag.y, drag.y + drag.height),
        width: Math.abs(drag.width),
        height: Math.abs(drag.height),
      };
      const id = nanoid();

      if (tool === "box") {
        const a: AnnHighlight = {
          id,
          type: "box",
          page,
          color: currentCat.color,
          category: currentCat.key,
          box: toNorm(rect, size.w, size.h),
          createdAt: Date.now(),
          comment: currentCat.label,
        };
        emit([...annos, a]);
      } else {
        const a: AnnHighlight = {
          id,
          type: tool,
          page,
          color: currentCat.color,
          category: currentCat.key,
          rects: [toNorm(rect, size.w, size.h)],
          createdAt: Date.now(),
          comment: currentCat.label,
        };
        emit([...annos, a]);
      }
      setDrag(null);
    };

    const annsThis = annos.filter((a) => a.page === page);

    return (
      <Stage width={size.w} height={size.h} listening={!printing} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}>
        <Layer>
          {annsThis.map((a) => {
            if (a.type === "highlight" && a.rects)
              return a.rects.map((r, i) => {
                const d = fromNorm(r, size.w, size.h);
                const pal = colorForAnno(a);
                const displayN = Number.isFinite((a as any).number) ? Number((a as any).number) : (orderMap[a.id] ?? undefined);
                const label = displayN ? `#${displayN}` : "#?";
                const fontSize = 10;
                const chipW = Math.max(20, label.length * 6 + 6);
                const chipH = 16;
                return (
                  <Group key={a.id + "_" + i}>
                    <Rect
                      x={d.x}
                      y={d.y}
                      width={d.width}
                      height={d.height}
                      fill={pal.rgba}
                      opacity={0.22}
                      cornerRadius={3}
                    />
                    {/* chip #n */}
                    <Group x={d.x + 2} y={d.y + 2}>
                      <Rect
                        width={chipW}
                        height={chipH}
                        fill="#ffffff"
                        cornerRadius={8}
                        shadowBlur={2}
                        shadowOpacity={0.15}
                      />
                      <Text x={4} y={3} text={label} fontSize={fontSize} fill="#334155" />
                    </Group>
                  </Group>
                );
              });

            if (a.type === "strike" && a.rects)
              return a.rects.map((r, i) => {
                const d = fromNorm(r, size.w, size.h);
                return <Line key={a.id + "_" + i} points={[d.x, d.y + d.height / 2, d.x + d.width, d.y + d.height / 2]} stroke={(colorForAnno(a).color)} strokeWidth={2} />;
              });

            if (a.type === "box" && a.box) {
              const d = fromNorm(a.box, size.w, size.h);
              return <Rect key={a.id} x={d.x} y={d.y} width={d.width} height={d.height} stroke={(colorForAnno(a).color)} strokeWidth={2} dash={[6, 4]} />;
            }

            if (a.type === "pen" && a.pen) {
              return <Line key={a.id} points={a.pen.points!} stroke={a.color} strokeWidth={a.pen.width || 2} lineCap="round" lineJoin="round" />;
            }

            if (a.type === "comment" && a.at) {
              const d = { x: a.at.x * size.w, y: a.at.y * size.h };
              return (
                <Group key={a.id}>
                  <Text x={d.x} y={d.y} text="✦" fontSize={16} fill={a.color} />
                </Group>
              );
            }

            return null;
          })}

          {drag && (
            <Rect
              x={Math.min(drag.x, drag.x + drag.width)}
              y={Math.min(drag.y, drag.y + drag.height)}
              width={Math.abs(drag.width)}
              height={Math.abs(drag.height)}
              stroke={currentCat.color}
              dash={[4, 3]}
            />
          )}
        </Layer>
      </Stage>
    );
  }

  /** --------- render --------- */
  return (
    <div className="flex flex-col h-full">
      <div className="mb-2">
        {!printing && !hideLocalToolbar && <Toolbar />}
      </div>
      {!fileUrl && <div className="p-4 text-muted-foreground">Preparando arquivo…</div>}

      {fileUrl && (
        <div className="mt-1 space-y-8 overflow-auto relative" style={{ maxHeight: "calc(100vh - 240px)" }}>
          {PDF_DEBUG && (
            <div className="absolute top-1 right-2 z-50 text-[10px] bg-black/70 text-white px-2 py-1 rounded shadow">
              <div>PDF debug</div>
              <div>src: {fileUrl.startsWith('blob:') ? 'blob' : 'url'}</div>
            </div>
          )}
          {safeMode && !pagesGateOpen && (
            <div className="mx-0 mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Modo seguro: renderizando somente a 1ª página para iniciar mais rápido.
              <button className="ml-2 underline" onClick={() => setPagesGateOpen(true)}>Carregar todas</button>
            </div>
          )}
          <Document
            file={fileUrl}
            loading={<div className="p-4 text-muted-foreground">Carregando PDF…</div>}
            error={<div className="p-4 text-destructive">Falha ao carregar PDF</div>}
            onLoadError={(err: Error) => {
              console.error("Falha ao carregar PDF", err);
              onError?.(err);
            }}
            onLoadSuccess={({ numPages }: any) => {
              setNumPages(numPages);
              if (!pagesGateOpen) {
                const auto = ((import.meta as any).env?.VITE_PDF_SAFE_MODE === '1');
                if (auto || numPages >= 12) setSafeMode(true);
              }
            }}
          >
            {Array.from(new Array(pagesToRender), (_, i) => (
              <div
                key={i + 1}
                ref={(el) => (pageWrapRefs.current[i + 1] = el)}
                className="relative block w-full"
              >
                <Page
                  pageNumber={i + 1}
                  width={pageWidths[i + 1] || undefined}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  onLoadSuccess={(p: any) => {
                    const view = p._pageInfo.view; // [x0, y0, w, h] in user space units
                    const pageW = view[2];
                    const pageH = view[3];
                    const targetW = pageWidths[i + 1] || pageW;
                    const ratio = pageH / pageW;
                    const vw = Math.max(1, Math.floor(targetW));
                    const vh = Math.max(1, Math.floor(vw * ratio));
                    setPageSizes((s) => ({ ...s, [i + 1]: { w: vw, h: vh } }));
                  }}
                />
                {pageSizes[i + 1] && (
                  <div
                    className="absolute inset-0"
                    style={{ pointerEvents: printing ? 'none' : 'auto' }}
                  >
                    <PageOverlay page={i + 1} />
                  </div>
                )}
              </div>
            ))}
          </Document>
        </div>
      )}
    </div>
  );
}
