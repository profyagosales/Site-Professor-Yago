/**
 * Calcula o intervalo de páginas visíveis (1-based) para uma lista de páginas com altura uniforme.
 */
export function computeVisibleRange(params: {
  numPages: number;
  pageHeight: number; // altura efetiva da página (já considerando zoom e aspect)
  pageGap: number;
  scrollTop: number;
  viewportH: number;
  buffer?: number; // buffer extra acima/abaixo em px
}) {
  const { numPages, pageHeight, pageGap, scrollTop, viewportH } = params;
  const buffer = params.buffer ?? viewportH; // padrão: 1 viewport
  const unit = pageHeight + pageGap;
  const first = Math.max(1, Math.floor((scrollTop - buffer) / unit) + 1);
  const last = Math.min(
    numPages,
    Math.ceil((scrollTop + viewportH + buffer) / unit) + 1
  );
  const topPad = (first - 1) * unit;
  return { first, last, topPad };
}

/**
 * Retorna o scrollTop para alinhar o topo da página p (1-based) no scroller.
 */
export function scrollTopForPage(params: {
  page: number;
  hostWidth: number;
  zoom: number;
  aspect: number; // h/w
  pageGap: number;
}) {
  const { page, hostWidth, zoom, aspect, pageGap } = params;
  const pageW = Math.floor(hostWidth * zoom);
  const pageH = Math.floor(pageW * aspect);
  const unit = pageH + pageGap;
  return (page - 1) * unit;
}
