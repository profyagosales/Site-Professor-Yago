// Bridge: Composer <-> reasonIds + justification

import C1_N0 from './composers/C1_N0';
import C1_N1 from './composers/C1_N1';
import C1_N2 from './composers/C1_N2';
import C1_N3 from './composers/C1_N3';
import C1_N4 from './composers/C1_N4';
import C1_N5 from './composers/C1_N5';
import C2_N1 from './composers/C2_N1';
import C2_N2 from './composers/C2_N2';
import C2_N3 from './composers/C2_N3';
import C2_N4 from './composers/C2_N4';
import C2_N5 from './composers/C2_N5';
import C3_N0 from './composers/C3_N0';
import C3_N1 from './composers/C3_N1';
import C3_N2 from './composers/C3_N2';
import C3_N3 from './composers/C3_N3';
import C3_N4 from './composers/C3_N4';
import C3_N5 from './composers/C3_N5';
import C4_N0 from './composers/C4_N0';
import C4_N1 from './composers/C4_N1';
import C4_N2 from './composers/C4_N2';
import C4_N3 from './composers/C4_N3';
import C4_N4 from './composers/C4_N4';
import C4_N5 from './composers/C4_N5';
import C5_N0 from './composers/C5_N0';
import C5_N1 from './composers/C5_N1';
import C5_N2 from './composers/C5_N2';
import C5_N3 from './composers/C5_N3';
import C5_N4 from './composers/C5_N4';
import C5_N5 from './composers/C5_N5';
import type { RubricReasonId } from './rubricReasonIds';

export type ComposerId =
  | 'C1_N0'
  | 'C1_N1'
  | 'C1_N2'
  | 'C1_N3'
  | 'C1_N4'
  | 'C1_N5'
  | 'C2_N1'
  | 'C2_N2'
  | 'C2_N3'
  | 'C2_N4'
  | 'C2_N5'
  | 'C3_N0'
  | 'C3_N1'
  | 'C3_N2'
  | 'C3_N3'
  | 'C3_N4'
  | 'C3_N5'
  | 'C4_N0'
  | 'C4_N1'
  | 'C4_N2'
  | 'C4_N3'
  | 'C4_N4'
  | 'C4_N5'
  | 'C5_N0'
  | 'C5_N1'
  | 'C5_N2'
  | 'C5_N3'
  | 'C5_N4'
  | 'C5_N5'
  | (string & {});
export type PieceKind = 'MANDATORY' | 'CHOICE_SINGLE' | 'CHOICE_MULTI' | 'MONOBLOCK' | 'PLACEHOLDER';

export type ComposerOption = { id: string; label: string };
type BasePiece = { key: string; label: string; noId?: boolean };
export type ComposerPiece =
  | (BasePiece & { kind: 'MANDATORY' })
  | (BasePiece & { kind: 'CHOICE_SINGLE'; options: ComposerOption[] })
  | (BasePiece & { kind: 'CHOICE_MULTI'; options: ComposerOption[] })
  | (BasePiece & { kind: 'MONOBLOCK'; optionId: string })
  | (BasePiece & { kind: 'PLACEHOLDER' });

export type LevelComposer = {
  id: ComposerId;
  pieces: ComposerPiece[];
  connectors?: Array<'E' | 'OU' | 'E/OU'>;
};

export type ComposerSelection = Record<string, string | string[] | boolean>;

type MaybeReasonId = RubricReasonId | '';
type MandatoryReason = { kind: 'MANDATORY'; reasonId?: MaybeReasonId };
type ChoiceSingleReason = { kind: 'CHOICE_SINGLE'; options: Record<string, MaybeReasonId> };
type ChoiceMultiReason = { kind: 'CHOICE_MULTI'; options: Record<string, MaybeReasonId> };
type MonoblockReason = { kind: 'MONOBLOCK'; optionId: string; reasonId: MaybeReasonId };
type ReasonEntry = MandatoryReason | ChoiceSingleReason | ChoiceMultiReason | MonoblockReason;
type ReasonMap = Record<ComposerId, Record<string, ReasonEntry | undefined>>;

/** Mapa inicial com IDs REAIS para C2-N3 (dados enviados pelo Yago) */
export const REASON_MAP: ReasonMap = {
  C1_N0: {},
  C1_N1: {},
  C1_N2: {},
  C1_N3: {},
  C1_N4: {},
  C1_N5: {},
  C2_N1: {
    c2n1_ou: {
      kind: 'CHOICE_SINGLE',
      options: {
        tangencia: 'c2_l1_tangencia',
        caotico: 'c2_l1_aglomerado',
        tipos: 'c2_l1_outros_tipos',
      },
    },
  },
  C2_N2: {
    c2n2_ou: {
      kind: 'CHOICE_SINGLE',
      options: {
        partes_2_embr: 'c2_l2_3partes_2_embrionarias',
        conclusao_inc: 'c2_l2_conclusao_incompleta',
      },
    },
    c2n2_flag: {
      kind: 'CHOICE_MULTI',
      options: {
        muitas_copias: 'c2_l2_muitas_copias',
      },
    },
  },
  C2_N3: {
    c2n3_partes: { kind: 'MANDATORY', reasonId: 'c2_l3_3partes_1_embrionaria' },
    c2n3_rep: {
      kind: 'CHOICE_MULTI',
      options: {
        rep_nao_leg: 'c2_l3_repertorio_nao_legitimado',
        rep_leg_nao: 'c2_l3_repertorio_legitimado_nao_pertinente',
      },
    },
  },
  C2_N4: {
    c2n4_partes: { kind: 'MANDATORY', reasonId: 'c2_l4_3partes_nenhuma_embrionaria' },
    c2n4_rep_leg: { kind: 'MANDATORY', reasonId: 'c2_l4_repertorio_legitimado' },
    c2n4_rep_pert: { kind: 'MANDATORY', reasonId: 'c2_l4_pertinente_sem_produtivo' },
  },
  C2_N5: {
    c2n5_partes: { kind: 'MANDATORY', reasonId: 'c2_l5_3partes_nenhuma_embrionaria' },
    c2n5_rep_leg: { kind: 'MANDATORY', reasonId: 'c2_l5_repertorio_legitimado' },
    c2n5_rep_pert: { kind: 'MANDATORY', reasonId: 'c2_l5_pertinente_com_produtivo' },
  },
  C3_N0: {},
  C3_N1: {},
  C3_N2: {
    c3n2_proj: { kind: 'MANDATORY', reasonId: 'c3_l2_muitas_falhas' },
    c3n2_dev: {
      kind: 'CHOICE_SINGLE',
      options: {
        sem_dev: 'c3_l2_sem_desenvolvimento',
        dev_uma_info: 'c3_l2_desenvolvimento_um',
      },
    },
    c3n2_flag: { kind: 'MONOBLOCK', optionId: 'contradicao_grave', reasonId: 'c3_l2_contradicao_grave' },
  },
  C3_N3: {},
  C3_N4: {},
  C3_N5: {},
  C4_N0: {},
  C4_N1: {
    c4n1_multi: {
      kind: 'CHOICE_MULTI',
      options: {
        elem_intra_inter: 'c4_l1_intra_inter',
        repet_excessivas: 'c4_l1_excessivas_repeticoes',
        inadequ_excessivas: 'c4_l1_excessivas_inadequacoes',
      },
    },
  },
  C4_N2: {
    c4n2_multi: {
      kind: 'CHOICE_MULTI',
      options: {
        elem_intra_inter: 'c4_l2_intra_inter',
        repet_muitas: 'c4_l2_muitas_repeticoes',
        inadequ_muitas: 'c4_l2_muitas_inadequacoes',
      },
    },
    c4n2_flag: { kind: 'MONOBLOCK', optionId: 'monobloco', reasonId: 'c4_l2_texto_monobloco' },
  },
  C4_N3: {
    c4n3_multi: {
      kind: 'CHOICE_MULTI',
      options: {
        elem_intra_inter: 'c4_l3_intra_inter',
        repet_algumas: 'c4_l3_algumas_repeticoes',
        inadequ_algumas: 'c4_l3_algumas_inadequacoes',
      },
    },
  },
  C4_N4: {
    c4n4_multi: {
      kind: 'CHOICE_MULTI',
      options: {
        elem_intra_inter: 'c4_l4_intra_inter',
        repet_poucas: 'c4_l4_poucas_repeticoes',
        inadequ_poucas: 'c4_l4_poucas_inadequacoes',
      },
    },
  },
  C4_N5: {
    c4n5_multi: {
      kind: 'CHOICE_MULTI',
      options: {
        elem_intra_inter: 'c4_l5_intra_inter',
        repet_raras_ausentes: 'c4_l5_raras_ausentes_repeticoes',
        inadequ_sem: 'c4_l5_sem_inadequacoes',
      },
    },
  },
  C5_N0: {
    c5n0_ou: {
      kind: 'CHOICE_SINGLE',
      options: {
        ausencia: 'c5_l0_ausencia',
        desrespeito_dh: 'c5_l0_desrespeita_dh',
        nao_relacionada: 'c5_l0_nao_relacionada',
      },
    },
  },
  C5_N1: {
    c5n1_ou: {
      kind: 'CHOICE_SINGLE',
      options: {
        tangenciamento: 'c5_l1_tangenciamento',
        apenas_nulos: 'c5_l1_elementos_nulos',
        um_valido: 'c5_l1_um_elemento_valido',
      },
    },
  },
  C5_N2: {
    c5n2_ou: {
      kind: 'CHOICE_SINGLE',
      options: {
        dois_validos: 'c5_l2_dois_elementos',
        condicional_2plus: 'c5_l2_condicional',
      },
    },
  },
  C5_N3: {},
  C5_N4: {},
  C5_N5: {},
};

export const COMPOSERS: Record<ComposerId, LevelComposer> = {
  C1_N0,
  C1_N1,
  C1_N2,
  C1_N3,
  C1_N4,
  C1_N5,
  C2_N1,
  C2_N2,
  C2_N3,
  C2_N4,
  C2_N5,
  C3_N0,
  C3_N1,
  C3_N2,
  C3_N3,
  C3_N4,
  C3_N5,
  C4_N0,
  C4_N1,
  C4_N2,
  C4_N3,
  C4_N4,
  C4_N5,
  C5_N0,
  C5_N1,
  C5_N2,
  C5_N3,
  C5_N4,
  C5_N5,
};

function shouldSkipMissing(piece: ComposerPiece): boolean {
  return piece.noId === true || piece.kind === 'MANDATORY' || piece.kind === 'PLACEHOLDER';
}

function logMissing(piece: ComposerPiece, composerId: ComposerId, detail?: string) {
  if (shouldSkipMissing(piece)) return;
  const suffix = detail ? `${piece.key}:${detail}` : piece.key;
  console.warn('[ENEM-bridge] reasonId ausente para:', [`${composerId}:${suffix}`]);
}

type ResolveResult = {
  ids: MaybeReasonId[];
  missing: Array<string | undefined>;
  takeover: boolean;
};

function resolvePieceIds(
  piece: ComposerPiece,
  entry: ReasonEntry | undefined,
  selections: ComposerSelection
): ResolveResult {
  switch (piece.kind) {
    case 'MANDATORY': {
      if (entry?.kind === 'MANDATORY' && entry.reasonId) {
        return { ids: [entry.reasonId], missing: [], takeover: false };
      }
      return { ids: [], missing: shouldSkipMissing(piece) ? [] : [undefined], takeover: false };
    }
    case 'CHOICE_SINGLE': {
      const chosen = selections[piece.key];
      if (typeof chosen !== 'string') {
        return { ids: [], missing: [], takeover: false };
      }
      if (entry?.kind === 'CHOICE_SINGLE') {
        const rid = entry.options[chosen];
        if (rid) {
          return { ids: [rid], missing: [], takeover: false };
        }
      }
      return { ids: [], missing: shouldSkipMissing(piece) ? [] : [chosen], takeover: false };
    }
    case 'CHOICE_MULTI': {
      const chosen = selections[piece.key];
      if (!Array.isArray(chosen) || chosen.length === 0) {
        return { ids: [], missing: [], takeover: false };
      }
      if (entry?.kind === 'CHOICE_MULTI') {
        const ids = chosen
          .map((opt) => entry.options[opt])
          .filter((rid): rid is MaybeReasonId => Boolean(rid));
        const missingOpts = chosen.filter((opt) => !entry.options[opt]);
        return {
          ids,
          missing: shouldSkipMissing(piece) ? [] : missingOpts,
          takeover: false,
        };
      }
      return { ids: [], missing: shouldSkipMissing(piece) ? [] : chosen, takeover: false };
    }
    case 'MONOBLOCK': {
      const active = Boolean(selections[piece.key]);
      if (!active) {
        return { ids: [], missing: [], takeover: false };
      }
      if (entry?.kind === 'MONOBLOCK' && entry.reasonId) {
        return { ids: [entry.reasonId], missing: [], takeover: true };
      }
      return { ids: [], missing: shouldSkipMissing(piece) ? [] : [undefined], takeover: true };
    }
    case 'PLACEHOLDER':
    default:
      return { ids: [], missing: [], takeover: false };
  }
}

export function getComposerById(id: ComposerId): LevelComposer {
  const composer = COMPOSERS[id];
  if (!composer) {
    throw new Error(`[composerBridge] Composer não registrado: ${id}`);
  }
  return composer;
}

export function collectReasonIds(
  composerId: ComposerId,
  composer: LevelComposer,
  selections: ComposerSelection,
  reasonMap: ReasonMap = REASON_MAP
) {
  const map = reasonMap[composerId] || {};
  const collected: MaybeReasonId[] = [];
  const missing: string[] = [];

  for (const piece of composer.pieces) {
    const entry = map[piece.key];
    const { ids, missing: pieceMissing, takeover } = resolvePieceIds(piece, entry, selections);

    if (pieceMissing.length) {
      pieceMissing.forEach((detail) => {
        logMissing(piece, composerId, detail);
        if (!shouldSkipMissing(piece)) {
          const formatted = detail ? `${composerId}:${piece.key}:${detail}` : `${composerId}:${piece.key}`;
          missing.push(formatted);
        }
      });
    }

    if (takeover) {
      collected.length = 0;
      if (ids.length) {
        collected.push(...ids);
      }
      break;
    }

    if (ids.length) {
      collected.push(...ids);
    }
  }

  const reasonIds = Array.from(new Set(collected.filter((id): id is RubricReasonId => Boolean(id && id.length)))).sort();

  return { reasonIds, missing };
}

export function composeJustification(
  composer: LevelComposer,
  selections: ComposerSelection
): string {
  if (composer.id === 'C5_N3' || composer.id === 'C5_N4' || composer.id === 'C5_N5') {
    const mandatory = composer.pieces.find((piece) => piece.kind === 'MANDATORY');
    return mandatory ? mandatory.label : '';
  }

  const parts: string[] = [];
  let segmentCount = 0;
  const connectors = composer.connectors ?? [];

  for (let index = 0; index < composer.pieces.length; index += 1) {
    const piece = composer.pieces[index];
    if (piece.kind === 'MONOBLOCK') {
      if (selections[piece.key]) {
        parts.length = 0;
        parts.push(piece.label);
        break;
      }
      continue;
    }

    let value: string | null = null;

    if (piece.kind === 'MANDATORY') {
      value = piece.label;
    }

    if (piece.kind === 'CHOICE_SINGLE') {
      const v = selections[piece.key];
      if (typeof v === 'string') {
        const opt = piece.options.find((o) => o.id === v);
        if (opt) value = opt.label;
      }
    }

    if (piece.kind === 'CHOICE_MULTI') {
      const arr = selections[piece.key];
      if (Array.isArray(arr) && arr.length) {
        if (arr.includes('monobloco')) {
          const mono = piece.options.find((o) => o.id === 'monobloco')?.label;
          if (mono) {
            value = mono;
          }
        } else {
          const labels = arr
            .map((id) => piece.options.find((o) => o.id === id)?.label)
            .filter(Boolean) as string[];
          if (labels.length) value = labels.join(', ');
        }
      }
    }

    if (!value) continue;

    if (segmentCount > 0) {
      const connector = connectors[Math.min(segmentCount - 1, connectors.length - 1)] ?? 'E';
      parts.push(connector);
    }
    parts.push(value);
    segmentCount += 1;
  }

  return parts.join(' ').trim();
}

export function buildSavePayload(
  composer: LevelComposer,
  selections: ComposerSelection
) {
  const justification = composeJustification(composer, selections).trim();
  const { reasonIds } = collectReasonIds(composer.id, composer, selections);
  const normalized = Array.from(new Set(reasonIds)).filter((id): id is string => Boolean(id && id.length)).sort();
  return { reasonIds: normalized, justification };
}

export function buildSelectionFromReasonIds(
  composer: LevelComposer,
  reasonIds: readonly string[] | undefined,
  reasonMap: ReasonMap = REASON_MAP
): ComposerSelection {
  const list = Array.isArray(reasonIds) ? reasonIds : [];
  const selection: ComposerSelection = {};
  const mapping = reasonMap[composer.id] ?? {};

  composer.pieces.forEach((piece) => {
    const entry = mapping[piece.key];
    if (piece.noId === true && (piece.kind === 'MANDATORY' || piece.kind === 'PLACEHOLDER')) {
      selection[piece.key] = true;
      return;
    }
    switch (piece.kind) {
      case 'MANDATORY':
        selection[piece.key] = true;
        break;
      case 'CHOICE_SINGLE': {
        let chosen: string | undefined;
        if (entry?.kind === 'CHOICE_SINGLE') {
          for (const [optId, rid] of Object.entries(entry.options)) {
            if (list.includes(rid)) {
              chosen = optId;
              break;
            }
          }
        }
        if (chosen) selection[piece.key] = chosen;
        break;
      }
      case 'CHOICE_MULTI': {
        const selected: string[] = [];
        if (entry?.kind === 'CHOICE_MULTI') {
          for (const [optId, rid] of Object.entries(entry.options)) {
            if (list.includes(rid)) selected.push(optId);
          }
        }
        selection[piece.key] = selected;
        break;
      }
      case 'MONOBLOCK': {
        const active = entry?.kind === 'MONOBLOCK' && list.includes(entry.reasonId);
        if (active) selection[piece.key] = true;
        break;
      }
      default:
        break;
    }
  });

  const matched = new Set<string>();
  Object.values(mapping).forEach((entry) => {
    if (!entry) return;
    if (entry.kind === 'MANDATORY' && entry.reasonId && list.includes(entry.reasonId)) {
      matched.add(entry.reasonId);
    }
    if (entry.kind === 'MONOBLOCK' && entry.reasonId && list.includes(entry.reasonId)) {
      matched.add(entry.reasonId);
    }
    if (entry.kind === 'CHOICE_SINGLE' || entry.kind === 'CHOICE_MULTI') {
      Object.values(entry.options).forEach((rid) => {
        if (list.includes(rid)) matched.add(rid);
      });
    }
  });
  const missing = list.filter((rid) => !matched.has(rid));
  if (missing.length) {
    console.warn('[ENEM-bridge] reasonIds sem mapping para', composer.id, missing);
  }

  return selection;
}

export type CompKey = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
export type ComposerRegistry = Record<CompKey, Partial<Record<number, { id: ComposerId }>>>;

export function composeJustificationFromReasonIds(
  composerId: ComposerId,
  reasonIds: readonly string[] | undefined
): string {
  const composer = getComposerById(composerId);
  const selection = buildSelectionFromReasonIds(composer, reasonIds);
  return composeJustification(composer, selection).trim();
}

export function getComposerForLevel(
  competence: CompKey,
  level: number
): LevelComposer | null {
  const entry = COMPOSER_REGISTRY[competence]?.[level];
  if (!entry) return null;
  try {
    return getComposerById(entry.id);
  } catch (err) {
    console.warn('[ENEM-bridge] Composer não encontrado para', competence, level, err);
    return null;
  }
}

export function buildJustificationFromReasonIds(
  competence: CompKey,
  level: number,
  reasonIds: readonly string[] | undefined
): string | undefined {
  const composer = getComposerForLevel(competence, level);
  if (!composer) return undefined;
  const selection = buildSelectionFromReasonIds(composer, reasonIds);
  const justification = composeJustification(composer, selection).trim();
  return justification || undefined;
}

export const COMPOSER_REGISTRY: ComposerRegistry = {
  C1: {
    0: { id: 'C1_N0' },
    1: { id: 'C1_N1' },
    2: { id: 'C1_N2' },
    3: { id: 'C1_N3' },
    4: { id: 'C1_N4' },
    5: { id: 'C1_N5' },
  },
  C2: {
    1: { id: 'C2_N1' },
    2: { id: 'C2_N2' },
    3: { id: 'C2_N3' },
    4: { id: 'C2_N4' },
    5: { id: 'C2_N5' },
  },
  C3: {
    0: { id: 'C3_N0' },
    1: { id: 'C3_N1' },
    2: { id: 'C3_N2' },
    3: { id: 'C3_N3' },
    4: { id: 'C3_N4' },
    5: { id: 'C3_N5' },
  },
  C4: {
    0: { id: 'C4_N0' },
    1: { id: 'C4_N1' },
    2: { id: 'C4_N2' },
    3: { id: 'C4_N3' },
    4: { id: 'C4_N4' },
    5: { id: 'C4_N5' },
  },
  C5: {
    0: { id: 'C5_N0' },
    1: { id: 'C5_N1' },
    2: { id: 'C5_N2' },
    3: { id: 'C5_N3' },
    4: { id: 'C5_N4' },
    5: { id: 'C5_N5' },
  },
};
