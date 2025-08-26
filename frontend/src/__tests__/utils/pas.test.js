import { pasPreviewFrom } from '@/utils/pas';

describe('pasPreviewFrom', () => {
  test('no errors, NC=10, NL=1, weight=2', () => {
    const { raw, scaled, ne } = pasPreviewFrom({ NC: 10, NL: 1, annotations: [], weight: 2 });
    expect(ne).toBe(0);
    expect(raw).toBe(10);
    expect(scaled).toBe(2);
  });

  test('two errors reduce NC, clamps to >=0', () => {
    const anns = [
      { color: 'green', label: 'Erro' },
      { color: 'green', label: 'Erro' },
    ];
    const { raw, ne } = pasPreviewFrom({ NC: 5, NL: 1, annotations: anns, weight: 1 });
    expect(ne).toBe(2);
    expect(raw).toBe(1);
  });

  test('scales with NL, many errors', () => {
    const anns = Array.from({ length: 6 }, () => ({ color: 'green', label: 'Erro' }));
    const { raw } = pasPreviewFrom({ NC: 10, NL: 5, annotations: anns, weight: 1 });
    // raw = 10 - (2*6)/5 = 10 - 2.4 = 7.6
    expect(raw).toBe(7.6);
  });
});
