import type React from "react";
import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { emitPdfEvent } from '@/services/telemetry.service';

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
};

export type PdfAnnotatorProps = {
  fileUrl: string | null;
  essayId: string;
  palette: PaletteItem[];
  onChange?: (annos: AnnHighlight[]) => void;
  onJoinAsTeacher?: () => Promise<void> | void;
  onRefreshFileUrl?: () => Promise<void> | void;
};

export default function PdfAnnotator({
  fileUrl,
  essayId,
  palette,
  onChange,
  onJoinAsTeacher,
  onRefreshFileUrl,
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
  const [pageSizes, setPageSizes] = useState<Record<number, { w: number; h: number }>>({});

  // arquivo
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [docErr, setDocErr] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const lastBlobUrlRef = useRef<string | null>(null);
  const lastStatusRef = useRef<number | null>(null);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [debugMeta, setDebugMeta] = useState<{ step?: string | number; size?: number; srcType?: string } | null>(null);
  const PDF_DEBUG = (import.meta as any).env?.VITE_PDF_DEBUG === '1';

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

  const assignBlobUrl = (url: string) => {
    if (lastBlobUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(lastBlobUrlRef.current);
    }
    lastBlobUrlRef.current = url;
    setBlobUrl(url);
  };

  /** --------- carrega o PDF como Blob URL usando token temporário --------- */
  useEffect(() => {
    if (!essayId || !fileUrl) {
      setBlobUrl(null);
      if (!fileUrl) setDocErr(null);
      return;
    }

    let abort = false;
    let ctrl: AbortController | null = null;
    let revoke: string | null = null;

    setDocErr(null);
    if (lastBlobUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = null;
    }
    setBlobUrl(null);
    setJoinErr(null);
    setJoinLoading(false);
    lastStatusRef.current = null;
    setLastStatus(null);

    async function load() {
      ctrl = new AbortController();
      const url = fileUrl!;
      try {
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store',
          signal: ctrl.signal,
          redirect: 'follow',
        });

        lastStatusRef.current = res.status;
        if (!res.ok) {
          const status = res.status;
          if ((status === 401 || status === 403) && onRefreshFileUrl) {
            await Promise.resolve(onRefreshFileUrl());
          }
          const error: any = new Error(`HTTP ${status}`);
          error.status = status;
          throw error;
        }

        const blob = await res.blob();
        if (abort) return;
        const objectUrl = URL.createObjectURL(blob);
        revoke = objectUrl;
        assignBlobUrl(objectUrl);
        emitPdfEvent('pdf_load_success', { essayId, srcType: 'blob', step: 'file-download' });
        if (PDF_DEBUG) {
          setDebugMeta({ step: 'file-download', size: blob.size, srcType: 'blob' });
        }
      } catch (error: any) {
        if (abort) return;
        const status = error?.status ?? error?.response?.status ?? lastStatusRef.current ?? null;
        lastStatusRef.current = status;
        setLastStatus(status);
        emitPdfEvent('pdf_load_error', { essayId, step: 'file-download', message: String(error?.message || error) });

        let message = 'Não foi possível carregar o PDF (sessão expirada ou token inválido).';
        if (status === 401) {
          message = 'Sessão expirada. Faça login novamente.';
        } else if (status === 403) {
          message = 'Seu usuário não está vinculado à turma desta redação. Entre como professor da turma e tente novamente.';
        } else if (status === 404) {
          message = 'Arquivo não encontrado. Verifique se a redação possui PDF anexado ou reenvie o arquivo.';
        } else if (typeof error?.message === 'string' && error.message) {
          message = error.message;
        }
        setDocErr(message);
      }
    }

    load();

    return () => {
      abort = true;
      if (ctrl) ctrl.abort();
      const currentBlob = revoke;
      if (currentBlob) {
        URL.revokeObjectURL(currentBlob);
        if (lastBlobUrlRef.current === currentBlob) {
          lastBlobUrlRef.current = null;
        }
      }
    };
  }, [essayId, fileUrl, retryKey, onRefreshFileUrl]);



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
      <div className="ml-auto flex gap-2">
        <button onClick={() => setScale((s) => Math.max(0.75, s - 0.1))} className="px-2 py-1 rounded border">
          –
        </button>
        <span className="px-2 py-1">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(2, s + 0.1))} className="px-2 py-1 rounded border">
          +
        </button>
      </div>
    </div>
  );

  /** --------- overlay por página --------- */
  function PageOverlay({ page }: { page: number }) {
    const size = pageSizes[page];
    const [drag, setDrag] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    if (!size) return null;

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
      <Stage width={size.w} height={size.h} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}>
        <Layer>
          {annsThis.map((a) => {
            if (a.type === "highlight" && a.rects)
              return a.rects.map((r, i) => {
                const d = fromNorm(r, size.w, size.h);
                return (
                  <Rect
                    key={a.id + "_" + i}
                    x={d.x}
                    y={d.y}
                    width={d.width}
                    height={d.height}
                    fill={currentCat.rgba}
                    opacity={0.6}
                    cornerRadius={3}
                  />
                );
              });

            if (a.type === "strike" && a.rects)
              return a.rects.map((r, i) => {
                const d = fromNorm(r, size.w, size.h);
                return <Line key={a.id + "_" + i} points={[d.x, d.y + d.height / 2, d.x + d.width, d.y + d.height / 2]} stroke={a.color} strokeWidth={2} />;
              });

            if (a.type === "box" && a.box) {
              const d = fromNorm(a.box, size.w, size.h);
              return <Rect key={a.id} x={d.x} y={d.y} width={d.width} height={d.height} stroke={a.color} strokeWidth={2} dash={[6, 4]} />;
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

  const handleJoinClass = async () => {
    if (!onJoinAsTeacher) return;
    setJoinErr(null);
    setJoinLoading(true);
    try {
      await Promise.resolve(onJoinAsTeacher());
      setDocErr(null);
      if (onRefreshFileUrl) {
        try {
          await Promise.resolve(onRefreshFileUrl());
        } catch (refreshError) {
          console.error('refreshFileUrl failed', refreshError);
        }
      }
      setRetryKey((k) => k + 1);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Não foi possível entrar na turma.';
      setJoinErr(msg);
    } finally {
      setJoinLoading(false);
    }
  };

  /** --------- render --------- */
  return (
    <div className="flex flex-col h-full">
      <div className="mb-2">
        <Toolbar />
      </div>

      {docErr && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          <p>{docErr}</p>
          {lastStatus === 403 && onJoinAsTeacher && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={handleJoinClass}
                className="rounded border border-orange-300 bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800 hover:bg-orange-200 disabled:opacity-60"
                disabled={joinLoading}
              >
                {joinLoading ? 'Entrando…' : 'Entrar como professor desta turma'}
              </button>
              {joinErr && <span className="text-xs text-red-600">{joinErr}</span>}
            </div>
          )}
          <button
            onClick={() => {
              if (onRefreshFileUrl) {
                Promise.resolve(onRefreshFileUrl()).catch((err) => console.error('refreshFileUrl failed', err));
              }
              setRetryKey((k) => k + 1);
            }}
            className="mt-2 rounded border border-red-300 bg-white px-2 py-1 text-sm hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!blobUrl && !docErr && <div className="p-4 text-muted-foreground">Preparando arquivo…</div>}

      {blobUrl && (
        <div className="mt-1 space-y-8 overflow-auto relative" style={{ maxHeight: "calc(100vh - 240px)" }}>
          {PDF_DEBUG && debugMeta && (
            <div className="absolute top-1 right-2 z-50 text-[10px] bg-black/70 text-white px-2 py-1 rounded shadow">
              <div>PDF debug</div>
              <div>step: {debugMeta.step}</div>
              {typeof debugMeta.size === 'number' && <div>size: {(debugMeta.size/1024/1024).toFixed(2)} MB</div>}
              <div>src: {debugMeta.srcType}</div>
            </div>
          )}
          {safeMode && !pagesGateOpen && (
            <div className="mx-0 mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Modo seguro: renderizando somente a 1ª página para iniciar mais rápido.
              <button className="ml-2 underline" onClick={() => setPagesGateOpen(true)}>Carregar todas</button>
            </div>
          )}
          <Document
            file={blobUrl}
            loading={<div className="p-4 text-muted-foreground">Carregando PDF…</div>}
            error={<div className="p-4 text-destructive">Falha ao carregar PDF</div>}
            onLoadSuccess={({ numPages }: any) => {
              setNumPages(numPages);
              if (!pagesGateOpen) {
                const auto = ((import.meta as any).env?.VITE_PDF_SAFE_MODE === '1');
                if (auto || numPages >= 12) setSafeMode(true);
              }
            }}
          >
            {Array.from(new Array(pagesToRender), (_, i) => (
              <div key={i + 1} className="relative inline-block">
                <Page
                  pageNumber={i + 1}
                  scale={scale}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  onLoadSuccess={(p: any) => {
                    const vw = p._pageInfo.view[2] * scale;
                    const vh = p._pageInfo.view[3] * scale;
                    setPageSizes((s) => ({ ...s, [i + 1]: { w: vw, h: vh } }));
                  }}
                />
                {pageSizes[i + 1] && (
                  <div className="absolute inset-0 pointer-events-auto">
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