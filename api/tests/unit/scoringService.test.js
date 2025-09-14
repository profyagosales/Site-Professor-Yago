const { applyScoring, computeBimesterScore } = require('../../services/scoringService');

// Mock do modelo AnnotationSet usado internamente para auto contagem de erros PAS
jest.mock('../../models/AnnotationSet', () => ({
  findOne: jest.fn(async () => null)
}));

const AnnotationSet = require('../../models/AnnotationSet');

describe('scoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeEssay(type='ENEM') {
    return { type, annulment: { active: false, reasons: [] }, countInBimester: true };
  }

  test('ENEM válido calcula soma correta', async () => {
    const essay = makeEssay('ENEM');
    await applyScoring({ essay, payload: { type: 'ENEM', c1:200, c2:160, c3:120, c4:80, c5:40 } });
    expect(essay.enem.rawScore).toBe(600);
    expect(essay.annulment.active).toBe(false);
    computeBimesterScore(essay);
    expect(essay.computedBimesterScore).toBeCloseTo(6.0,2);
  });

  test('ENEM valores inválidos dispara erro', async () => {
    const essay = makeEssay('ENEM');
    await expect(applyScoring({ essay, payload: { type:'ENEM', c1:201, c2:160, c3:120, c4:80, c5:40 } }))
      .rejects.toThrow(/Valor inválido/);
  });

  test('PAS com NE fornecido usa valor enviado', async () => {
    const essay = makeEssay('PAS');
    await applyScoring({ essay, payload: { type:'PAS', NC: 8, NE: 2, NL: 20 } });
    // rawScore = 8 - (2*2/20)=8 - 0.2 = 7.8
    expect(essay.pas.rawScore).toBeCloseTo(7.8,2);
  });

  test('PAS sem NE dispara auto contagem (mock retorna 0)', async () => {
    const essay = makeEssay('PAS');
    await applyScoring({ essay, payload: { type:'PAS', NC: 9, NL: 30 } });
    expect(essay.pas.rawScore).toBe(9);
  });

  test('PAS auto contagem com highlights grammar', async () => {
    AnnotationSet.findOne.mockResolvedValueOnce({ highlights: [ { category:'grammar' }, { category:'argument' }, { category:'grammar' } ] });
    const essay = makeEssay('PAS');
    await applyScoring({ essay, payload: { type:'PAS', NC: 10, NL: 10 } });
    // NE auto = 2 => raw = 10 - (2*2/10)=10 -0.4 = 9.6
    expect(essay.pas.rawScore).toBeCloseTo(9.6,2);
  });

  test('Anulação força rawScore 0 mantendo estrutura ENEM', async () => {
    const essay = makeEssay('ENEM');
    await applyScoring({ essay, payload: { type:'ENEM', c1:200,c2:200,c3:200,c4:200,c5:200 } });
    expect(essay.enem.rawScore).toBe(1000);
    await applyScoring({ essay, payload: { type:'ENEM', annulment: { active:true, reasons:['plagio'] }, c1:200,c2:200,c3:200,c4:200,c5:200 } });
    expect(essay.enem.rawScore).toBe(0);
    expect(essay.annulment.active).toBe(true);
    expect(essay.annulment.reasons).toContain('plagio');
  });

  test('computeBimesterScore undefined quando countInBimester false', async () => {
    const essay = makeEssay('ENEM');
    essay.countInBimester = false;
    await applyScoring({ essay, payload: { type:'ENEM', c1:200,c2:200,c3:200,c4:200,c5:200 } });
    expect(essay.enem.rawScore).toBe(1000);
    computeBimesterScore(essay);
    expect(essay.computedBimesterScore).toBeUndefined();
  });

  test('computeBimesterScore para PAS com clamp e anulação', async () => {
    const essay = makeEssay('PAS');
    await applyScoring({ essay, payload: { type:'PAS', NC: 12, NE: 0, NL: 10 } }); // raw 12
    computeBimesterScore(essay);
    expect(essay.computedBimesterScore).toBe(10); // clamp
    await applyScoring({ essay, payload: { type:'PAS', annulment:{ active:true, reasons:['conteudo impróprio'] }, NC:12, NE:0, NL:10 } });
    computeBimesterScore(essay);
    expect(essay.computedBimesterScore).toBe(0);
  });
});
