// Serviço central de cálculo de notas e normalização
// Regras MVP:
//  - ENEM: competências c1..c5 ∈ {0,40,80,120,160,200}; rawScore = soma (0-1000)
//  - PAS: rawScore = max(0, NC - 2*NE/NL) com NL>=1 (default 1)
//  - Anulação: se active=true e reasons>=1 => força rawScore=0 (preserva campos)
//  - Normalização bimestral (computedBimesterScore) quando countInBimester=true:
//       ENEM: rawScore/1000 * 10 (escala 0-10)
//       PAS: assume faixa 0-10 → rawScore (clamp 0-10)
// Observação: futura configuração poderá alterar pesos/escala; encapsular aqui.

const AnnotationSet = require('../models/AnnotationSet');

const ENEM_ALLOWED = [0,40,80,120,160,200];

function validateEnemPayload({ c1, c2, c3, c4, c5 }) {
  const comps = { c1, c2, c3, c4, c5 };
  for (const [k,v] of Object.entries(comps)) {
    if (v === undefined || v === null) throw new Error(`Competência ${k.toUpperCase()} ausente`);
    if (!ENEM_ALLOWED.includes(v)) throw new Error(`Valor inválido para ${k}: ${v}`);
  }
  return comps;
}

function calculateEnem(scores) {
  const { c1, c2, c3, c4, c5 } = validateEnemPayload(scores);
  const rawScore = c1 + c2 + c3 + c4 + c5; // 0-1000
  return { c1, c2, c3, c4, c5, rawScore };
}

function calculatePas({ NC, NE, NL }) {
  if (NC === undefined || NC === null) throw new Error('NC obrigatório');
  if (NE === undefined || NE === null) throw new Error('NE obrigatório');
  NL = NL || 1;
  if (NL <= 0) NL = 1;
  if (NC < 0 || NE < 0) throw new Error('NC e NE devem ser >= 0');
  const rawScore = Math.max(0, NC - (2 * NE / NL)); // sem teto aqui, assumido <=10
  return { NC, NE, NL, rawScore };
}

async function maybeAutoCountPasErrors(essayId, providedNE) {
  if (providedNE !== undefined && providedNE !== null) return providedNE;
  // Conta highlights categoria grammar como erros (1 highlight = 1 erro)
  const set = await AnnotationSet.findOne({ essayId });
  if (!set) return 0;
  return (set.highlights || []).filter(h => h.category === 'grammar').length;
}

function computeBimesterScore(essay) {
  if (!essay.countInBimester) {
    essay.computedBimesterScore = undefined;
    return;
  }
  if (essay.annulment && essay.annulment.active) {
    essay.computedBimesterScore = 0;
    return;
  }
  if (essay.type === 'ENEM' && essay.enem && typeof essay.enem.rawScore === 'number') {
    essay.computedBimesterScore = Number(((essay.enem.rawScore / 1000) * 10).toFixed(2));
  } else if (essay.type === 'PAS' && essay.pas && typeof essay.pas.rawScore === 'number') {
    const raw = Math.min(10, Math.max(0, essay.pas.rawScore));
    essay.computedBimesterScore = Number(raw.toFixed(2));
  } else {
    essay.computedBimesterScore = undefined;
  }
}

async function applyScoring({ essay, payload }) {
  const { type, annulment } = payload;
  if (type && type !== essay.type) {
    throw new Error('Tipo enviado não corresponde ao tipo da redação');
  }

  if (annulment && annulment.active) {
    if (!annulment.reasons || !Array.isArray(annulment.reasons) || annulment.reasons.length === 0) {
      throw new Error('Anulação requer pelo menos um motivo');
    }
    essay.annulment = { active: true, reasons: annulment.reasons.slice(0,5) };
    // Zerar notas mantendo estrutura
    if (essay.type === 'ENEM') {
      essay.enem = { ...essay.enem, rawScore: 0 };
    } else if (essay.type === 'PAS') {
      essay.pas = { ...essay.pas, rawScore: 0 };
    }
  } else {
    essay.annulment = { active: false, reasons: [] };
    if (essay.type === 'ENEM') {
      essay.enem = calculateEnem(payload);
    } else if (essay.type === 'PAS') {
      const autoNE = await maybeAutoCountPasErrors(essay.id, payload.NE);
      essay.pas = calculatePas({ NC: payload.NC, NE: autoNE, NL: payload.NL });
    }
  }

  computeBimesterScore(essay);
}

module.exports = {
  applyScoring,
  computeBimesterScore
};
