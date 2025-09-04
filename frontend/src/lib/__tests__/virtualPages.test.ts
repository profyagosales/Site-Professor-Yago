// @ts-nocheck
import { computeVisibleRange, scrollTopForPage } from '../virtualPages';

describe('virtualPages utils', () => {
  test('computeVisibleRange basic', () => {
    const r = computeVisibleRange({
      numPages: 10,
      pageHeight: 1000,
      pageGap: 20,
      scrollTop: 0,
      viewportH: 600,
    });
    expect(r.first).toBe(1);
    expect(r.last).toBeGreaterThanOrEqual(1);
    expect(r.topPad).toBe(0);
  });

  test('computeVisibleRange mid scroll', () => {
    const unit = 1000 + 20;
    const scrollTop = Math.floor(unit * 2.5);
    const r = computeVisibleRange({
      numPages: 10,
      pageHeight: 1000,
      pageGap: 20,
      scrollTop,
      viewportH: 600,
    });
    expect(r.first).toBeGreaterThanOrEqual(2);
    expect(r.last).toBeGreaterThan(r.first);
  });

  test('scrollTopForPage', () => {
    const hostWidth = 800;
    const zoom = 1.2;
    const aspect = 1.4;
    const pageGap = 16;
    const t1 = scrollTopForPage({ page: 1, hostWidth, zoom, aspect, pageGap });
    const t2 = scrollTopForPage({ page: 2, hostWidth, zoom, aspect, pageGap });
    expect(t2).toBeGreaterThan(t1);
  });
});
