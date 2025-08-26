import { toRendered, toPdfSpace } from '@/utils/pdfBBox';

describe('pdfBBox conversions', () => {
  const orig = { w: 600, h: 800 };
  const effW = 300; // 0.5 scale
  const rendH = 400; // 0.5 scale

  test('toRendered scales correctly', () => {
    const b = { x: 60, y: 80, w: 120, h: 160 };
    const r = toRendered(b, orig, effW, rendH);
    expect(r).toEqual({ x: 30, y: 40, w: 60, h: 80 });
  });

  test('toPdfSpace scales and clamps', () => {
    const r = { x: 30, y: 40, w: 60, h: 80 };
    const b = toPdfSpace(r, orig, effW, rendH);
    expect(b).toEqual({ x: 60, y: 80, w: 120, h: 160 });
  });
});
