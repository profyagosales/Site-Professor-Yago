const { canTransition, assertTransition } = require('../../services/statusService');

describe('statusService', () => {
  test('canTransition permite transições válidas', () => {
    expect(canTransition('PENDING','GRADING')).toBe(true);
    expect(canTransition('GRADING','GRADED')).toBe(true);
    expect(canTransition('GRADED','SENT')).toBe(true);
  });

  test('canTransition bloqueia transições inválidas', () => {
    expect(canTransition('PENDING','GRADED')).toBe(false);
    expect(canTransition('GRADING','SENT')).toBe(false);
    expect(canTransition('SENT','PENDING')).toBe(false);
  });

  test('canTransition idempotente quando status igual', () => {
    expect(canTransition('PENDING','PENDING')).toBe(true);
  });

  test('assertTransition aplica transição válida', () => {
    const essay = { status: 'PENDING' };
    assertTransition(essay,'GRADING');
    expect(essay.status).toBe('GRADING');
  });

  test('assertTransition é idempotente', () => {
    const essay = { status: 'GRADING' };
    assertTransition(essay,'GRADING');
    expect(essay.status).toBe('GRADING');
  });

  test('assertTransition lança erro em transição inválida', () => {
    const essay = { status: 'PENDING' };
    expect(() => assertTransition(essay,'GRADED')).toThrow(/inválida/);
  });

  test('assertTransition valida parâmetros', () => {
    expect(() => assertTransition(null,'GRADING')).toThrow(/ausente/);
    expect(() => assertTransition({ status: 'PENDING' }, null)).toThrow(/ausente/);
  });
});
