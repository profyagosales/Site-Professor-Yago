import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";

/**
 * IMPORTANTE: não importar 'react-pdf' nem 'react-konva' no topo.
 * Carregamos dinamicamente para não puxar os chunks antes do vendor/React.
 */

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
  rects?: RectNorm[];
  box?: RectNorm;
  pen?: PenPath;
  at?: { x: number; y: number };
  createdAt: number;
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
  /* ============== lazy: react-pdf ============== */
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
      } catch (err) {
        console.error("Falha ao carregar react-pdf", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /* ============== lazy: react-konva ============== */
  const [RK, setRK] = useState<any>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const m = await import(/* @vite-ignore */ "react-konva");
        if (active) setRK(m);
      } catch (err) {
        console.error("Falha ao carregar react-konva", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /* ============== estados gerais ============== */
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<"highlight" | "strike" | "box" | "pen" | "comment">("highlight");
  const [currentCat, setCurrentCat] = useState<PaletteItem>(palette[1] ?? palette[0]);
  const [annos, setAnnos] = useState<AnnHighlight[]>([]);
  const [pageSizes, setPageSizes] = useState<Record<number, { w: number; h: number }>>({});

  /* ============== loader do PDF (Blob URL com fallbacks) ============== */
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docErr, setDocErr] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const lastBlobUrlRef = useRef<string | null>(null);

  // Helpers
  const isSameOrigin = (u: string): boolean => {
    try {
      const url = new URL(u, window.location.origin);
      return url.origin === window.location.origin;
    } catch {
      return false;
    }
  };
  const getQueryToken = (u: string): string | undefined => {
    try {
      const url = new URL(u, window.location.origin);
      const t = url.searchParams.get("token");
      return t || undefined;
    } catch {
      return undefined;
    }
  };
  const fetchWith = async (p: {
    url: string;
    useCookies: boolean;
    bearer?: string;
    signal: AbortSignal;
  }): Promise<Blob> => {
    const headers: Record<string, string> = {};
    if (p.bearer) headers["Authorization"] = `Bearer ${p.bearer}`;
    const res = await fetch(p.url, {
      method: "GET",
      signal: p.signal,
      cache: "no-store",
      credentials: p.useCookies ? "include" : "omit",
      headers,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  };
  const getFreshToken = async (id?: string, signal?: AbortSignal): Promise<string | undefined> => {
    if (!id) return undefined;
    try {
      const res = await fetch(`/api/essays/${id}/file-token`, {
        method: "GET",
        credentials: "include",
        signal,
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) return undefined;
        throw new Error(`token ${res.status}`);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json().catch(() => ({}));
        return j?.token || j?.accessToken || undefined;
      }
      const t = (await res.text()).trim();
      return t || undefined;
    } catch (e) {
      return undefined;
    }
  };

  useEffect(() => {
    if (!fileSrc) return;
    let alive = true;
    const ac = new AbortController();
    setDocUrl(null);
    setDocErr(null);

    (async () => {
      const same = isSameOrigin(fileSrc);
      const qToken = getQueryToken(fileSrc);

      const attempts: Array<() => Promise<Blob>> = [];

      // a) mesma origem -> cookies
      if (same) {
        attempts.push(() => fetchWith({ url: fileSrc, useCookies: true, signal: ac.signal }));
      }

      // b) se tiver token na query -> Authorization Bearer sem cookies
      if (qToken) {
        attempts.push(() => fetchWith({ url: fileSrc, useCookies: false, bearer: qToken, signal: ac.signal }));
        // alternativa: mesma URL com cookies (alguns backends aceitam ambos)
        attempts.push(() => fetchWith({ url: fileSrc, useCookies: true, signal: ac.signal }));
      }

      // endpoint direto com sessão
      if (essayId) {
        attempts.push(() => fetchWith({ url: `/api/essays/${essayId}/file`, useCookies: true, signal: ac.signal }));
      }

      // c) refresh opcional de token e repetir (b)
      attempts.push(async () => {
        const fresh = await getFreshToken(essayId, ac.signal);
        if (!fresh) throw new Error("no fresh token");
        return await fetchWith({ url: fileSrc, useCookies: false, bearer: fresh, signal: ac.signal });
      });

      let blob: Blob | null = null;
      for (const run of attempts) {
        try {
          blob = await run();
          break;
        } catch (e: any) {
          if (import.meta.env?.DEV) console.warn("[PDF] tentativa falhou:", e?.message || e);
          continue;
        }
      }

      if (!blob) {
        if (alive) setDocErr("Falha ao carregar PDF");
        return;
      }

      const url = URL.createObjectURL(blob);
      if (!alive) {
        URL.revokeObjectURL(url);
        return;
      }
      if (lastBlobUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = url;
      setDocUrl(url);
    })();

    return () => {
      ac.abort();
      if (lastBlobUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(lastBlobUrlRef.current);
        lastBlobUrlRef.current = null;
      }
    };
  }, [fileSrc, essayId, retryKey]);

  /* ============== utils de geometria ============== */
  const toNorm = (r: { x: number; y: number; width: number; height: number }, w: number, h: number): RectNorm => ({
    x: r.x / w,
    y: r.y / h,
    w: r.width / w,
    h: r.height / h,
  });
  const fromNorm = (r: RectNorm, w: number, h: number) => ({ x: r.x * w, y: r.y * h, width: r.w * w, height: r.h * h });

  const emit = (list: AnnHighlight[]) => {
    setAnnos(list);
    onChange?.(list);
  };

  /* ============== placeholders ============== */
  if (!RP) return <div className="p-4 text-muted-foreground">Carregando visualizador…</div>;
  if (!RK) return <div className="p-4 text-muted-foreground">Carregando ferramentas…</div>;

  /* ============== componentes carregados ============== */
  const { Document, Page } = RP as any;
  const Stage: React.ComponentType<any> = (RK as any).Stage;
  const Layer: React.ComponentType<any> = (RK as any).Layer;
  const Rect: React.ComponentType<any> = (RK as any).Rect;
  const Line: React.ComponentType<any> = (RK as any).Line;
  const Group: React.ComponentType<any> = (RK as any).Group;
  const Text: React.ComponentType<any> = (RK as any).Text;

  /* ============== toolbar ============== */
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

  /* ============== overlay por página ============== */
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
                return (
                  <Line key={a.id + "_" + i} points={[d.x, d.y + d.height / 2, d.x + d.width, d.y + d.height / 2]} stroke={a.color} strokeWidth={2} />
                );
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

  /* ============== render ============== */
  return (
    <div className="flex flex-col h-full">
      <div className="mb-2">
        <Toolbar />
      </div>

      {docErr && (
        <div className="mx-2 mb-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
          <span>{docErr}</span>
          <button
            className="ml-3 rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
            onClick={() => setRetryKey((k) => k + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="mt-1 space-y-8 overflow-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
        {!docUrl && !docErr && (
          <div className="p-4 text-muted-foreground">Preparando arquivo…</div>
        )}
        {docUrl && (
          <Document
            file={docUrl}
            loading={<div className="p-4 text-muted-foreground">Carregando PDF…</div>}
            error={<div className="p-4 text-destructive">Falha ao carregar PDF</div>}
            onLoadSuccess={({ numPages }: any) => setNumPages(numPages)}
          >
          {Array.from({ length: numPages }, (_, i) => (
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
        )}
      </div>
    </div>
  );
}