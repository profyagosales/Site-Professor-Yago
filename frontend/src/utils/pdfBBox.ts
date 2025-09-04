export type Size = { w: number; h: number };
export type BBox = { x: number; y: number; w: number; h: number };

// Converte de espaço original do PDF (pontos) para pixels renderizados
export function toRendered(
  bbox: BBox,
  orig: Size,
  effectiveWidth: number,
  renderedHeight: number
): BBox {
  const scaleX = effectiveWidth / orig.w;
  const scaleY = renderedHeight / orig.h;
  return {
    x: bbox.x * scaleX,
    y: bbox.y * scaleY,
    w: bbox.w * scaleX,
    h: bbox.h * scaleY,
  };
}

// Converte de pixels renderizados para espaço original do PDF (pontos)
export function toPdfSpace(
  rect: BBox,
  orig: Size,
  effectiveWidth: number,
  renderedHeight: number
): BBox {
  const scaleX = orig.w / effectiveWidth;
  const scaleY = orig.h / renderedHeight;
  return {
    x: Math.max(0, rect.x * scaleX),
    y: Math.max(0, rect.y * scaleY),
    w: Math.max(1, rect.w * scaleX),
    h: Math.max(1, rect.h * scaleY),
  };
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
