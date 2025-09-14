// Serviço de controle de transições de status de Redações
// Define uma máquina de estados simples para o ciclo de vida da redação.
// Estados: PENDING -> GRADING -> GRADED -> SENT
// Regras: não permite pular etapas ou regressões.

const allowed = Object.freeze({
  PENDING: ['GRADING'],
  GRADING: ['GRADED'],
  GRADED: ['SENT'],
  SENT: []
});

function canTransition(current, target) {
  if (!current || !target) return false;
  if (current === target) return true; // idempotente (não altera mas não quebra)
  return (allowed[current] || []).includes(target);
}

function assertTransition(essay, target) {
  if (!essay) throw new Error('Objeto essay ausente na transição');
  if (!target) throw new Error('Target status ausente');
  if (essay.status === target) return essay.status; // idempotente
  if (!canTransition(essay.status, target)) {
    throw new Error(`Transição de status inválida: ${essay.status} -> ${target}`);
  }
  essay.status = target;
  essay.updatedAt = Date.now();
  return essay.status;
}

module.exports = {
  allowedTransitions: allowed,
  canTransition,
  assertTransition
};
