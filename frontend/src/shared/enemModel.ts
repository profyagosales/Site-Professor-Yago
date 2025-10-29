export type UiModel = 'ENEM' | 'PAS';

export function toApiModel(model: UiModel) {
  if (model === 'ENEM') return 'ENEM_2024';
  if (model === 'PAS') return 'PAS_UNB';
  return model;
}
