import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ENEM_2024,
  type EnemCompetency,
  type EnemLevel,
  type RubricCriterion,
  type RubricGroup,
} from '@/features/essay/rubrics/enem2024';
import { highlightUppercaseTokens } from '@/utils/text';
import {
  buildSavePayload,
  buildSelectionFromReasonIds,
  buildJustificationFromReasonIds,
  getComposerForLevel,
  type ComposerSelection,
  type LevelComposer,
} from '@/features/enem/composerBridge';
import { ALL_RUBRIC_REASON_IDS } from '@/features/enem/rubricReasonIds';
import { MandatoryChip } from '@/features/enem/ui/MandatoryChip';
import { Connector } from '@/features/enem/ui/Connector';
import { ChoiceSelect, ChoiceMulti } from '@/features/enem/ui/ChoiceSelect';
import { selfTestRoundTrip } from '@/features/enem/testRoundTrip';

const HIGHLIGHT_RE = /\b(E\/OU|E|OU|COM|MAS|NÃO|NENHUMA|ALGUMAS?)\b/gi;
function highlightTokens(text: string, strongClass?: string) {
  return text.split(HIGHLIGHT_RE).map((part, i) => {
    if (!part) return null;
    const key = part.toUpperCase();
    const isNeg = key === 'NÃO' || key === 'NENHUMA';
    HIGHLIGHT_RE.lastIndex = 0;
    return HIGHLIGHT_RE.test(part)
      ? (
          <mark
            key={i}
            className={[`enem-token${isNeg ? ' ' : ''}`, strongClass].filter(Boolean).join(' ')}
            data-k={isNeg ? 'neg' : undefined}
          >
            {key}
          </mark>
        )
      : <span key={i}>{part}</span>;
  });
}
import { ENEM_COLORS_HEX, toRoman } from '@/features/redacao/pdf/theme';

type CompetencyKey = EnemCompetency['key'];

export type EnemSelection = {
  level: number;
  reasonIds: string[];
  justification?: string;
};

export type EnemSelectionsMap = Record<CompetencyKey, EnemSelection>;

type Props = {
  selections: EnemSelectionsMap;
  onChange: (key: CompetencyKey, selection: EnemSelection) => void;
  onFocusCategory?: (category: 'argumentacao' | 'ortografia' | 'coesao' | 'apresentacao' | 'comentarios') => void;
};

type GroupRenderProps = {
  competencyKey: CompetencyKey;
  level: EnemLevel;
  group: RubricGroup;
  selectedReasonIds: Set<string>;
  onUpdateReasons: (newReasonIds: string[]) => void;
};

const HIGHLIGHT_CLASS = 'bg-amber-100 text-amber-700 font-semibold px-1 rounded';

const COMPETENCY_CARD_TONE: Record<CompetencyKey, string> = {
  C1: 'enem-c1-card',
  C2: 'enem-c2-card',
  C3: 'enem-c3-card',
  C4: 'enem-c4-card',
  C5: 'enem-c5-card',
};

const COMPOSER_ON = (import.meta.env?.VITE_ENEM_COMPOSER ?? '1') === '1';

const CONNECTOR_SET = new Set(['E', 'OU', 'E/OU']);
function isConnectorToken(txt: string) {
  const t = (txt ?? '').trim();
  const norm = t.replace(/[.,;:!?)]$/, '').replace(/^[(]/, '');
  // match ONLY uppercase exact tokens
  return CONNECTOR_SET.has(norm);
}

const RUBRIC_SET = new Set<string>(ALL_RUBRIC_REASON_IDS);

function debugCheck(ids: string[], ctx: string) {
  const bad = ids.filter((id) => !RUBRIC_SET.has(id));
  if (bad.length) {
    console.warn(`[ENEM verify] IDs fora do rubric em ${ctx}:`, bad);
  }
}

// Helper to render a label string with highlights (for justification summary)
function renderHighlighted(label: string, palette: { strong: string; title: string; pastel: string }, strongClass?: string) {
  // Use renderSummary to highlight tokens in the label string
  return renderSummary(label, palette, strongClass);
}
function renderSummary(summary: string, palette: { strong: string; title: string; pastel: string }, strongClass?: string) {
  // keep uppercase highlights, but also force E/OU tokens
  const parts = highlightUppercaseTokens(summary);
  return parts.flatMap((part, index) => {
    if (part.highlight) {
      return (
        <span
          key={`sum-${index}`}
          className={strongClass}
          style={{ backgroundColor: palette.pastel, color: palette.strong, fontWeight: 600, padding: '0 2px', borderRadius: '3px' }}
        >
          {part.text}
        </span>
      );
    }
    // split non-highlight part to find connectors
    return part.text.split(/(\s+)/).map((tok, i) => {
      if (tok.trim().length === 0) return <span key={`sum-${index}-${i}`}>{tok}</span>;
      const hi = isConnectorToken(tok);
      return (
        <span
          key={`sum-${index}-${i}`}
          className={hi ? strongClass : undefined}
          style={hi ? { backgroundColor: palette.pastel, color: palette.strong, fontWeight: 600, padding: '0 2px', borderRadius: '3px' } : undefined}
        >
          {tok}
        </span>
      );
    });
  });
}

function findCriterionIdByContains(node: RubricGroup | RubricCriterion, needle: string): string | null {
  const target = needle.toLowerCase();
  if ('id' in node) {
    return node.label.toLowerCase().includes(target) ? node.id : null;
  }
  for (const it of node.items) {
    const found = findCriterionIdByContains(it, needle);
    if (found) return found;
  }
  return null;
}

function ensureUnique(ids: (string | null | undefined)[]) {
  return Array.from(new Set(ids.filter(Boolean) as string[]));
}

function optionsByContains(rationale: RubricGroup, needles: string[]) {
  return needles
    .map((n) => ({ id: findCriterionIdByContains(rationale, n), label: n }))
    .filter((o) => !!o.id) as { id: string; label: string }[];
}

function fixLabel(label: string) {
  // Ortografia/normalizações pontuais
  return label.replace('Tangênciamento', 'Tangenciamento');
}

function collectReasonIds(node: RubricGroup | RubricCriterion | undefined | null): string[] {
  if (!node) return [];
  if ('id' in node) {
    return [node.id];
  }
  return node.items.flatMap((item) => collectReasonIds(item));
}

function uniqueReasonIds(ids: string[]) {
  return Array.from(new Set(ids));
}

// Helpers to resolve labels from reasonIds, preserving rubric order
function findCriterionLabelById(node: RubricGroup | RubricCriterion | undefined | null, id: string): string | null {
  if (!node) return null;
  if ('id' in node) {
    return node.id === id ? fixLabel(node.label) : null;
  }
  for (const it of node.items) {
    const got = findCriterionLabelById(it, id);
    if (got) return got;
  }
  return null;
}

function orderedSelectedLabels(rationale: RubricGroup | undefined | null, selected: string[]): string[] {
  // percorre a árvore e retorna as labels dos selecionados mantendo a ordem do rubric
  const out: string[] = [];
  function walk(node: RubricGroup | RubricCriterion) {
    if ('id' in node) {
      if (selected.includes(node.id)) out.push(fixLabel(node.label));
      return;
    }
    for (const it of node.items) walk(it);
  }
  if (rationale) walk(rationale);
  return out;
}

function ComposerViewGeneric({
  composer,
  initialReasonIds,
  onConfirm,
  connectorClassName,
}: {
  composer: LevelComposer;
  initialReasonIds?: string[];
  onConfirm: (sel: ComposerSelection) => void;
  connectorClassName?: string;
}) {
  const baseSelection = useMemo(() => {
    const defaults: ComposerSelection = {};
    composer.pieces.forEach((piece) => {
      switch (piece.kind) {
        case 'MANDATORY':
          defaults[piece.key] = true;
          break;
        case 'CHOICE_SINGLE':
          defaults[piece.key] = '';
          break;
        case 'CHOICE_MULTI':
          defaults[piece.key] = [] as string[];
          break;
        case 'MONOBLOCK':
          defaults[piece.key] = false;
          break;
        default:
          break;
      }
    });
    return defaults;
  }, [composer]);

  const loadedSelection = useMemo(
    () => buildSelectionFromReasonIds(composer, initialReasonIds),
    [composer, initialReasonIds?.slice().sort().join('|')]
  );

  const mergedInitial = useMemo(
    () => ({ ...baseSelection, ...loadedSelection }),
    [baseSelection, loadedSelection]
  );

  const [selection, setSelection] = useState<ComposerSelection>(mergedInitial);

  useEffect(() => {
    setSelection(mergedInitial);
  }, [mergedInitial]);

  const connectors = composer.connectors ?? [];
  const mandatoryPieces = useMemo(
    () => composer.pieces.filter((piece) => piece.kind === 'MANDATORY'),
    [composer]
  );
  const optionalPieces = useMemo(
    () => composer.pieces
      .map((piece, index) => ({ piece, index }))
      .filter(({ piece }) => piece.kind !== 'MANDATORY'),
    [composer]
  );
  const takeoverPieces = optionalPieces.filter(({ piece }) => piece.kind === 'MONOBLOCK');
  const activeTakeover = takeoverPieces.find(({ piece }) => Boolean(selection[piece.key]));

  const connectorFor = useCallback((
    ordinal: number,
    pieceIndex: number,
    kind: typeof composer.pieces[number]['kind']
  ): 'E' | 'OU' | 'E/OU' => {
    if (connectors.length === 0) {
      if (kind === 'CHOICE_SINGLE') return 'OU';
      if (kind === 'CHOICE_MULTI') return 'E/OU';
      return 'E';
    }
    const configuredByIndex = connectors[Math.min(Math.max(pieceIndex - 1, 0), connectors.length - 1)];
    const configuredByOrdinal = connectors[Math.min(Math.max(ordinal, 0), connectors.length - 1)];
    const fallback = kind === 'CHOICE_SINGLE' ? 'OU' : kind === 'CHOICE_MULTI' ? 'E/OU' : 'E';
    return configuredByIndex ?? configuredByOrdinal ?? fallback;
  }, [connectors]);

  type Segment = { key: string; label: string; connector?: 'E' | 'OU' | 'E/OU'; variant?: 'takeover' };

  const segments = useMemo<Segment[]>(() => {
    if (activeTakeover) {
      return [
        {
          key: activeTakeover.piece.key,
          label: activeTakeover.piece.label,
          variant: 'takeover',
        },
      ];
    }

    const list: Segment[] = [];

    mandatoryPieces.forEach((piece, idx) => {
      list.push({
        key: `${piece.key}-${idx}`,
        label: piece.label,
        connector: idx === 0 ? undefined : 'E',
      });
    });

    let ordinal = 0;
    optionalPieces.forEach(({ piece, index }) => {
      if (piece.kind === 'CHOICE_SINGLE') {
        const value = typeof selection[piece.key] === 'string' ? (selection[piece.key] as string) : '';
        if (!value) return;
        const option = piece.options.find((opt) => opt.id === value);
        if (!option) return;
        const connector = list.length === 0 ? undefined : connectorFor(ordinal, index, piece.kind);
        list.push({
          key: `${piece.key}-${value}`,
          label: option.label,
          connector,
        });
        ordinal += 1;
      } else if (piece.kind === 'CHOICE_MULTI') {
        const values = Array.isArray(selection[piece.key]) ? (selection[piece.key] as string[]) : [];
        if (!values.length) return;
        const labels = values
          .map((id) => piece.options.find((opt) => opt.id === id))
          .filter(Boolean) as { id: string; label: string }[];
        if (!labels.length) return;
        labels.forEach((opt, idx) => {
          const connector =
            list.length === 0 && idx === 0
              ? undefined
              : idx === 0
              ? connectorFor(ordinal, index, piece.kind)
              : 'E/OU';
          list.push({
            key: `${piece.key}-${opt.id}-${idx}`,
            label: opt.label,
            connector,
          });
        });
        ordinal += 1;
      } else if (piece.kind === 'MONOBLOCK') {
        const active = Boolean(selection[piece.key]);
        if (!active) return;
        const connector = list.length === 0 ? undefined : connectorFor(ordinal, index, piece.kind);
        list.push({
          key: `${piece.key}-mono`,
          label: piece.label,
          connector,
          variant: 'takeover',
        });
        ordinal += 1;
      }
    });

    return list;
  }, [activeTakeover, connectorFor, mandatoryPieces, optionalPieces, selection]);

  const controls = useMemo(() => {
    if (activeTakeover) return [] as React.ReactNode[];
    return optionalPieces.map(({ piece }) => {
      if (piece.kind === 'CHOICE_SINGLE') {
        const value = typeof selection[piece.key] === 'string' ? (selection[piece.key] as string) : '';
        if (value) return null;
        const options = piece.options.map((opt) => ({ value: opt.id, label: opt.label }));
        const handlePick = (val: string) => {
          setSelection((prev) => ({ ...prev, [piece.key]: val }));
        };
        return (
          <div key={piece.key} className="flex flex-wrap items-center gap-2">
            <span className="pdf-sm text-slate-500">{piece.label}</span>
            <ChoiceSelect value={value} options={options} onChange={handlePick} />
          </div>
        );
      }
      if (piece.kind === 'CHOICE_MULTI') {
        const values = Array.isArray(selection[piece.key]) ? (selection[piece.key] as string[]) : [];
        const options = piece.options.map((opt) => ({ value: opt.id, label: opt.label }));
        const handleToggle = (val: string, checked: boolean) => {
          setSelection((prev) => {
            const current = Array.isArray(prev[piece.key]) ? [...(prev[piece.key] as string[])] : [];
            if (checked) {
              if (!current.includes(val)) current.push(val);
            } else {
              const idx = current.indexOf(val);
              if (idx >= 0) current.splice(idx, 1);
            }
            return { ...prev, [piece.key]: current };
          });
        };
        return (
          <div key={piece.key} className="space-y-1">
            <span className="pdf-sm text-slate-500">{piece.label}</span>
            <ChoiceMulti values={values} options={options} onToggle={handleToggle} />
          </div>
        );
      }
      if (piece.kind === 'MONOBLOCK') {
        const active = Boolean(selection[piece.key]);
        const handleToggle = (checked: boolean) => {
          setSelection((prev) => ({ ...prev, [piece.key]: checked }));
        };
        return (
          <label key={piece.key} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600">
            <input
              type="checkbox"
              className="scale-90"
              checked={active}
              onChange={(event) => handleToggle(event.target.checked)}
            />
            {piece.label}
          </label>
        );
      }
      return null;
    }).filter(Boolean) as React.ReactNode[];
  }, [activeTakeover, optionalPieces, selection]);

  const lineActions: React.ReactNode[] = [];

  if (activeTakeover) {
    lineActions.push(
      <button
        key="takeover-edit"
        type="button"
        className="text-[10px] font-semibold text-slate-500 underline"
        onClick={() => {
          setSelection((prev) => ({
            ...prev,
            [activeTakeover.piece.key]: false,
          }));
        }}
      >
        editar
      </button>
    );
  } else {
    optionalPieces.forEach(({ piece }) => {
      if (piece.kind === 'CHOICE_SINGLE') {
        const value = typeof selection[piece.key] === 'string' ? (selection[piece.key] as string) : '';
        if (value) {
          lineActions.push(
            <button
              key={`${piece.key}-edit`}
              type="button"
              className="text-[10px] font-semibold text-slate-500 underline"
              onClick={() => setSelection((prev) => ({ ...prev, [piece.key]: '' }))}
            >
              editar
            </button>
          );
        }
      }
    });
  }

  const singlesValid = activeTakeover
    ? true
    : composer.pieces
        .filter((piece) => piece.kind === 'CHOICE_SINGLE')
        .every((piece) => {
          const value = selection[piece.key];
          return typeof value === 'string' && value.trim().length > 0;
        });

  const apply = () => {
    onConfirm(selection);
  };

  const chipLine = (
    <div className="enem-just-line">
      {segments.length === 0 ? (
        <span className="pdf-sm text-slate-500">Selecione itens para montar a justificativa.</span>
      ) : (
        segments.flatMap((segment, idx) => {
          const nodes: React.ReactNode[] = [];
          if (idx > 0 || segment.connector) {
            const connectorValue = segment.connector ?? 'E';
            nodes.push(
              <Connector
                key={`${segment.key}-connector`}
                kind={connectorValue}
                className={connectorClassName}
              />
            );
          }
          const chipClasses = ['enem-chip'];
          if (segment.variant === 'takeover') chipClasses.push('enem-chip--takeover');
          if (connectorClassName) chipClasses.push(connectorClassName);
          nodes.push(
            <span key={segment.key} className={chipClasses.join(' ')}>
              {segment.label}
            </span>
          );
          return nodes;
        })
      )}
      {lineActions.length > 0 && (
        <div className="ml-auto flex items-center gap-2">
          {lineActions}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      {chipLine}
      {!activeTakeover && controls.length > 0 && (
        <div className="space-y-2">
          {controls}
        </div>
      )}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          className="btn btn-primary"
          onClick={apply}
          disabled={!singlesValid}
          title="Aplicar justificativa"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

type LegacyEnemLevelFormProps = {
  competency: EnemCompetency;
  palette: { strong: string; title: string; pastel: string };
  roman: string;
  levelData: EnemLevel;
  selectedReasonIds: Set<string>;
  handleLevelChange: (level: EnemLevel) => void;
  handleReasonsChange: (reasonIds: string[]) => void;
  composerUI: ReactNode;
  labelsToShow: string[];
  fallbackJustification: string;
  justificationText: string;
  strongClass: string;
  cardToneClass: string;
};

function LegacyEnemLevelForm({
  competency,
  palette,
  roman,
  levelData,
  selectedReasonIds,
  handleLevelChange,
  handleReasonsChange,
  composerUI,
  labelsToShow,
  fallbackJustification,
  justificationText,
  strongClass,
  cardToneClass,
}: LegacyEnemLevelFormProps) {
  const fallbackText = fallbackJustification?.trim() ?? '';
  const hasLabels = labelsToShow.length > 0;

  return (
    <section
      id={`competencia-${competency.key}`}
      className={`space-y-2.5 rounded-2xl p-2.5 shadow-sm ${cardToneClass}`}
    >
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[15px] font-semibold leading-tight" style={{ color: palette.title }}>
            Competência {roman} — {competency.description}
          </h4>
          <span className="text-[13px] font-medium" style={{ color: palette.title }}>
            Nível selecionado:{' '}
            <span style={{ color: palette.strong, fontWeight: 700 }}>{levelData.level}</span>{' '}
            (<span style={{ color: palette.strong, fontWeight: 700 }}>{levelData.points}</span> pts)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {competency.levels.map((level) => {
            const isSelected = level.level === levelData.level;
            return (
              <button
                key={level.level}
                type="button"
                onClick={() => handleLevelChange(level)}
                className={`rounded-lg border px-2 py-1 text-[13px] transition ${
                  isSelected
                    ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-orange-200'
                }`}
                style={
                  isSelected
                    ? { borderColor: palette.title, backgroundColor: palette.pastel, color: palette.strong }
                    : undefined
                }
              >
                Nível {level.level} • {level.points}
              </button>
            );
          })}
        </div>
      </header>

      {!(competency.key === 'C2' || competency.key === 'C3' || competency.key === 'C4' || competency.key === 'C5') && (
        <div
          className="rounded-xl border px-3 py-2 leading-tight"
          style={{ backgroundColor: palette.pastel, borderColor: palette.pastel, color: palette.title }}
        >
          <div className="pdf-md">
            {renderSummary(levelData.summary, palette, strongClass).map((part, index) => (
              <Fragment key={index}>{part}</Fragment>
            ))}
          </div>
        </div>
      )}

      {composerUI ?? (levelData.rationale ? (
        competency.key === 'C2' ? (
          <RenderC2Overrides
            level={levelData}
            rationale={levelData.rationale}
            selectedReasonIds={selectedReasonIds}
            onUpdateReasons={handleReasonsChange}
            palette={palette}
          />
        ) : competency.key === 'C3' ? (
          <RenderC3Overrides
            level={levelData}
            rationale={levelData.rationale}
            selectedReasonIds={selectedReasonIds}
            onUpdateReasons={handleReasonsChange}
            palette={palette}
          />
        ) : competency.key === 'C4' ? (
          <RenderC4Overrides
            level={levelData}
            rationale={levelData.rationale}
            selectedReasonIds={selectedReasonIds}
            onUpdateReasons={handleReasonsChange}
            palette={palette}
          />
        ) : competency.key === 'C5' ? (
          <RenderC5Overrides
            level={levelData}
            rationale={levelData.rationale}
            selectedReasonIds={selectedReasonIds}
            onUpdateReasons={handleReasonsChange}
            palette={palette}
          />
        ) : (
          <RenderGroup
            competencyKey={competency.key}
            level={levelData}
            group={levelData.rationale}
            selectedReasonIds={selectedReasonIds}
            onUpdateReasons={handleReasonsChange}
          />
        )
      ) : null)}

      {(competency.key === 'C2' || competency.key === 'C3' || competency.key === 'C4' || competency.key === 'C5') && (
        <div
          className="rounded-xl border px-3 py-2 leading-tight"
          style={{ backgroundColor: palette.pastel, borderColor: palette.pastel, color: palette.title }}
        >
          <span className="pdf-xs font-semibold" style={{ color: palette.title }}>
            <span style={{ color: palette.strong }}>Justificativa selecionada:</span>
          </span>{' '}
          {justificationText ? (
            <span className="pdf-md">{highlightTokens(justificationText, strongClass)}</span>
          ) : fallbackText ? (
            <span className="pdf-md">{highlightTokens(fallbackText, strongClass)}</span>
          ) : hasLabels ? (
            <span>
              {labelsToShow.map((lbl, idx) => (
                <Fragment key={`legacy-sel-${idx}`}>
                  {idx > 0 && (
                    <span style={{ backgroundColor: palette.pastel, color: palette.strong, fontWeight: 700, padding: '0 2px', borderRadius: 3 }}>
                      {' '}E{' '}
                    </span>
                  )}
                  <span className="text-xs">
                    {renderHighlighted(lbl, palette, strongClass)}
                  </span>
                </Fragment>
              ))}
            </span>
          ) : (
            <span className="opacity-70">— nenhuma seleção ainda —</span>
          )}
        </div>
      )}
    </section>
  );
}

function RenderGroup({
  competencyKey,
  level,
  group,
  selectedReasonIds,
  onUpdateReasons,
}: GroupRenderProps) {
  const palette = ENEM_COLORS_HEX[competencyKey];
  const groupReasonIds = useMemo(() => collectReasonIds(group), [group]);
  const handleToggleCheckbox = (criterion: RubricCriterion, checked: boolean) => {
    const next = new Set(selectedReasonIds);
    if (checked) next.add(criterion.id);
    else next.delete(criterion.id);
    onUpdateReasons(uniqueReasonIds(Array.from(next)));
  };

  const handleSelectRadio = (criterion: RubricCriterion) => {
    const next = selectedReasonIds
      .filter((id) => !groupReasonIds.includes(id))
      .concat(criterion.id);
    onUpdateReasons(uniqueReasonIds(next));
  };

  const renderCriterion = (criterion: RubricCriterion, multiple: boolean, index: number) => {
    const norm = fixLabel(criterion.label);
    const rawParts = highlightUppercaseTokens(norm);
    const labelParts = rawParts.map((p) => ({
      ...p,
      highlight: p.highlight || isConnectorToken(p.text),
    }));
    const checked = selectedReasonIds.has(criterion.id);
    if (group.op === 'OR' && !multiple) {
      return (
        <label
          key={criterion.id}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1 text-[13px] leading-tight transition hover:border-orange-300"
          aria-describedby={`competencia-${competencyKey}`}
        >
          <input
            type="radio"
            name={`${competencyKey}-${level.level}-${groupReasonIds.join('-')}`}
            checked={checked}
            onChange={() => handleSelectRadio(criterion)}
            className="h-4 w-4 text-orange-500 focus:ring-orange-400"
          />
          <span
            className="block"
            style={{ display: '-webkit-box', WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}
            title={norm}
          >
            {labelParts.map((part, partIndex) => (
              <span
                key={partIndex}
                style={
                  part.highlight
                    ? {
                        backgroundColor: palette.pastel,
                        color: palette.strong,
                        fontWeight: 600,
                        padding: '0 2px',
                        borderRadius: '3px',
                      }
                    : undefined
                }
              >
                {part.text}
              </span>
            ))}
          </span>
        </label>
      );
    }
    return (
      <label
        key={criterion.id}
        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1 text-[13px] leading-tight transition hover:border-orange-300"
        aria-describedby={`competencia-${competencyKey}`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => handleToggleCheckbox(criterion, event.target.checked)}
          className="h-4 w-4 rounded text-orange-500 focus:ring-orange-400"
        />
        <span
          className="block"
          style={{ display: '-webkit-box', WebkitLineClamp: 2 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}
          title={norm}
        >
          {labelParts.map((part, partIndex) => (
            <span
              key={partIndex}
              style={
                part.highlight
                  ? {
                      backgroundColor: palette.pastel,
                      color: palette.strong,
                      fontWeight: 600,
                      padding: '0 2px',
                      borderRadius: '3px',
                    }
                  : undefined
              }
            >
              {part.text}
            </span>
          ))}
        </span>
      </label>
    );
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <p className="pdf-xs pdf-ink-subtle font-semibold leading-tight">
        {group.op === 'AND'
          ? 'Selecione os itens que justificam o nível (E)'
          : group.multiple
            ? 'Selecione os itens que justificam o nível (E/OU)'
            : 'Selecione um item que justifica o nível (OU)'}
      </p>
      <div className="space-y-2.5">
        {group.items.map((item, index) => {
          if ('id' in item) {
            return renderCriterion(item, group.multiple || group.op === 'AND', index);
          }
          return (
            <div key={`group-${index}`} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
              <RenderGroup
                competencyKey={competencyKey}
                level={level}
                group={item}
                selectedReasonIds={selectedReasonIds}
                onUpdateReasons={onUpdateReasons}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mapCompetencyToCategory(key: CompetencyKey): 'argumentacao' | 'ortografia' | 'coesao' | 'apresentacao' | 'comentarios' {
  switch (key) {
    case 'C1':
      return 'ortografia'; // norma padrão → ortografia/gramática
    case 'C2':
      return 'apresentacao'; // compreensão/tema → apresentação (aproximação útil)
    case 'C3':
      return 'argumentacao';
    case 'C4':
      return 'coesao';
    case 'C5':
      return 'argumentacao'; // proposta de intervenção tende a tocar argumentos
    default:
      return 'comentarios';
  }
}

function RenderC2Overrides({
  level,
  rationale,
  selectedReasonIds,
  onUpdateReasons,
  palette,
}: {
  level: EnemLevel;
  rationale: RubricGroup | undefined;
  selectedReasonIds: Set<string>;
  onUpdateReasons: (ids: string[]) => void;
  palette: { strong: string; title: string; pastel: string };
}) {
  if (!rationale) return null;

  // helpers to get ids by substring
  const id = (s: string) => findCriterionIdByContains(rationale, s);

  // C2 nível 1: select before justification, hide after choose, show Edit pill
  if (level.level === 1) {
    // OU exclusivo entre 3 opções
    const options = [
      { key: 'tangencia', label: 'Tangência ao tema', id: id('Tangência ao tema') },
      { key: 'aglomerado', label: 'Texto composto por aglomerado caótico de palavras', id: id('aglomerado caótico de palavras') },
      { key: 'outros-tipos', label: 'Traços constantes de outros tipos textuais', id: id('outros tipos textuais') },
    ].filter(o => o.id);
    const current = Array.from(selectedReasonIds)[0] || '';
    const [isEditing, setIsEditing] = useState(!current);
    // Find label for the selected id
    const selectedOption = options.find(o => o.id === current);
    if (!isEditing && current) {
      return (
        <div className="space-y-2 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
          <div className="flex items-center gap-2">
            <span
              className="text-xs rounded-full px-2 py-1 border font-medium"
              style={{
                backgroundColor: palette.pastel,
                borderColor: palette.title,
                color: palette.strong,
                borderWidth: 1,
                borderStyle: 'solid',
                fontSize: '13px'
              }}
            >
              {selectedOption ? renderHighlighted(selectedOption.label, palette) : null}
            </span>
            <button
              type="button"
              className="text-xs ml-2 px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-orange-50 text-orange-700"
              onClick={() => setIsEditing(true)}
              style={{ fontSize: '12px' }}
            >
              editar
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
        <p className="pdf-xs font-semibold leading-tight" style={{ color: palette.title }}>
          Selecione <strong>um</strong> item (OU)
        </p>
        <select
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={current}
          onChange={(e) => {
            onUpdateReasons(e.target.value ? [e.target.value] : []);
            setIsEditing(false);
          }}
        >
          <option value="">— escolher —</option>
          {options.map((o) => (
            <option key={o.key} value={o.id!}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (level.level === 2) {
    // Obrigatório + OU entre 2 + checkbox de cópias
    const obrig = id('Abordagem completa do tema');
    const optA = id('3 partes do texto (2 delas embrionárias)');
    const optB = id('conclusão finalizada por frase incompleta');
    const copias = id('Redação com muitas cópias');

    const selected = new Set(selectedReasonIds);
    const currentOU = selected.has(optA || '') ? (optA || '') : selected.has(optB || '') ? (optB || '') : '';
    const hasCopias = selected.has(copias || '');

    const apply = (ouVal: string, withCopias: boolean) => {
      if (withCopias && copias) {
        // Quando há muitas cópias, essa é a única justificativa
        onUpdateReasons([copias]);
        return;
      }
      const ids = ensureUnique([obrig, ouVal || null]);
      onUpdateReasons(ids);
    };

    return (
      <div className="space-y-3 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
        <div className="text-[13px] leading-tight" style={{ color: palette.title }}>
          <span className="mr-2 font-semibold" style={{ color: palette.strong }}>Obrigatório:</span>
          Abordagem completa do tema
        </div>
        <div className="space-y-1">
          <label
            className="font-semibold"
            style={{ fontSize: 'var(--pdf-fz-xs)', color: palette.title }}
          >
            Escolha uma opção (OU)
          </label>
          <select
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={currentOU}
            onChange={(e) => apply(e.target.value, hasCopias)}
            disabled={hasCopias}
          >
            <option value="">— escolher —</option>
            {optA && <option value={optA}>3 partes do texto (2 delas embrionárias)</option>}
            {optB && <option value={optB}>Conclusão finalizada por frase incompleta</option>}
          </select>
          {hasCopias && (
            <p className="text-[12px] text-slate-500">
              Ao marcar “Redação com muitas cópias”, somente essa justificativa será considerada.
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hasCopias}
            onChange={(e) => apply(currentOU, e.target.checked)}
          />
          Redação com muitas cópias
        </label>
      </div>
    );
  }

  if (level.level === 3) {
    // Dois obrigatórios + E/OU entre 2 opções (multi), mais checkbox opcional "Repertório baseado nos textos motivadores"
    const obrig1 = id('Abordagem completa do tema');
    const obrig2 = id('3 partes do texto (1 delas embrionárias)');
    const opt1 = id('Repertório não legitimado');
    const opt2 = id('Repertório legitimado MAS não pertencente ao tema');
    const opt0 = id('baseado nos textos motivadores') || id('repertório baseado nos textos motivadores');

    const selected = new Set(selectedReasonIds);
    const sel1 = selected.has(opt1 || '');
    const sel2 = selected.has(opt2 || '');
    const sel0 = selected.has(opt0 || '');

    const apply = (a: boolean, b: boolean, c: boolean) => {
      const ids = ensureUnique([
        obrig1,
        obrig2,
        a && opt1 ? opt1 : null,
        b && opt2 ? opt2 : null,
        c && opt0 ? opt0 : null,
      ]);
      onUpdateReasons(ids);
    };

    return (
      <div className="space-y-3 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
        <div className="text-[13px] leading-tight" style={{ color: palette.title }}>
          <span className="mr-2 font-semibold" style={{ color: palette.strong }}>Obrigatórios:</span>
          Abordagem completa do tema; 3 partes do texto (1 delas embrionárias)
        </div>
        <p
          className="font-semibold"
          style={{ fontSize: 'var(--pdf-fz-xs)', color: palette.title }}
        >
          Selecione um ou ambos (E/OU)
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sel1} onChange={(e) => apply(e.target.checked, sel2, sel0)} />
          Repertório não legitimado
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sel2} onChange={(e) => apply(sel1, e.target.checked, sel0)} />
          Repertório legitimado MAS não pertencente ao tema
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sel0} onChange={(e) => apply(sel1, sel2, e.target.checked)} />
          Repertório baseado nos textos motivadores
        </label>
      </div>
    );
  }

  if (level.level === 4 || level.level === 5) {
    // Tudo obrigatório; apenas exibir e garantir razões
    const needles = level.level === 4
      ? ['Abordagem completa do tema', '3 partes do texto (nenhuma embrionária)', 'repertório legitimado', 'pertinente ao tema', 'SEM uso produtivo']
      : ['Abordagem completa do tema', '3 partes do texto (nenhuma embrionária)', 'repertório legitimado', 'pertinente ao tema', 'COM uso produtivo'];
    const ids = ensureUnique(needles.map((n) => findCriterionIdByContains(rationale, n)));

    // se o estado atual difere, atualiza
    const current = ensureUnique(Array.from(selectedReasonIds));
    if (ids.length && ids.join('|') !== current.join('|')) {
      // nota: chamar onUpdateReasons dentro do render é aceitável aqui porque o bloco só monta quando o nível está ativo e evita loops comparando arrays
      onUpdateReasons(ids);
    }

    return (
      <div className="rounded-xl border p-2.5 text-[13px] leading-tight" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel, color: palette.title }}>
        Todos os itens deste nível são obrigatórios.
      </div>
    );
  }

  return null;
}

function RenderC3Overrides({
  level,
  rationale,
  selectedReasonIds,
  onUpdateReasons,
  palette,
}: {
  level: EnemLevel;
  rationale: RubricGroup | undefined;
  selectedReasonIds: Set<string>;
  onUpdateReasons: (ids: string[]) => void;
  palette: { strong: string; title: string; pastel: string };
}) {
  if (!rationale) return null;
  const id = (s: string) => findCriterionIdByContains(rationale, s);

  // NÍVEL 2: MUITAS falhas (obrigatório) E (OU) sem desenvolvimento | desenvolvimento de apenas uma informação; checkbox Contradição grave
  if (level.level === 2) {
    const obrig = id('projeto de texto com MUITAS falhas') || id('MUITAS falhas');
    const semDesenv = id('sem desenvolvimento');
    const desenvUma = id('desenvolvimento de apenas uma informação');
    const contradicao = id('Contradição grave');

    const sel = new Set(selectedReasonIds);
    const currentOU = sel.has(semDesenv || '') ? (semDesenv || '') : sel.has(desenvUma || '') ? (desenvUma || '') : '';
    const hasContrad = sel.has(contradicao || '');

    const apply = (ouVal: string, withContrad: boolean) => {
      const ids = ensureUnique([obrig, ouVal || null, withContrad ? contradicao : null]);
      onUpdateReasons(ids);
    };

    return (
      <div className="space-y-3 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
        <div className="text-[13px] leading-tight" style={{ color: palette.title }}>
          <span className="mr-2 font-semibold" style={{ color: palette.strong }}>Obrigatório:</span>
          projeto de texto com MUITAS falhas <span style={{ backgroundColor: palette.pastel, color: palette.strong, fontWeight: 600, padding: '0 2px', borderRadius: '3px' }}>E</span>
        </div>
        <div className="space-y-1">
          <label className="font-semibold" style={{ fontSize: 'var(--pdf-fz-xs)', color: palette.title }}>Escolha uma opção (OU)</label>
          <select
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={currentOU}
            onChange={(e) => apply(e.target.value, hasContrad)}
          >
            <option value="">— escolher —</option>
            {semDesenv && <option value={semDesenv}>sem desenvolvimento</option>}
            {desenvUma && <option value={desenvUma}>desenvolvimento de apenas uma informação</option>}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasContrad} onChange={(e) => apply(currentOU, e.target.checked)} />
          Contradição grave
        </label>
      </div>
    );
  }

  // NÍVEL 3: ALGUMAS falhas E Desenvolvimento … com ALGUMAS lacunas (ambos obrigatórios)
  if (level.level === 3) {
    const obrig1 = id('projeto de texto com ALGUMAS falhas') || id('ALGUMAS falhas');
    const obrig2 = id('Desenvolvimento de informações, fatos e opiniões com ALGUMAS lacunas');
    const ids = ensureUnique([obrig1, obrig2]);
    const current = ensureUnique(Array.from(selectedReasonIds));
    if (ids.length && ids.join('|') !== current.join('|')) onUpdateReasons(ids);
    return (
      <div className="rounded-xl border p-2.5 text-[13px] leading-tight" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel, color: palette.title }}>
        Todos os itens deste nível são obrigatórios.
      </div>
    );
  }

  // NÍVEL 4: POUCAS falhas E Desenvolvimento … com POUCAS lacunas (ambos obrigatórios)
  if (level.level === 4) {
    const obrig1 = id('projeto de texto com POUCAS falhas') || id('POUCAS falhas');
    const obrig2 = id('Desenvolvimento de informações, fatos e opiniões com POUCAS lacunas');
    const ids = ensureUnique([obrig1, obrig2]);
    const current = ensureUnique(Array.from(selectedReasonIds));
    if (ids.length && ids.join('|') !== current.join('|')) onUpdateReasons(ids);
    return (
      <div className="rounded-xl border p-2.5 text-[13px] leading-tight" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel, color: palette.title }}>
        Todos os itens deste nível são obrigatórios.
      </div>
    );
  }

  // NÍVEL 5: Projeto estratégico E Desenvolvimento … em TODO o texto (ambos obrigatórios)
  if (level.level === 5) {
    const obrig1 = id('Projeto de texto estratégico');
    const obrig2 = id('Desenvolvimento de informações, fatos e opiniões em TODO o texto');
    const ids = ensureUnique([obrig1, obrig2]);
    const current = ensureUnique(Array.from(selectedReasonIds));
    if (ids.length && ids.join('|') !== current.join('|')) onUpdateReasons(ids);
    return (
      <div className="rounded-xl border p-2.5 text-[13px] leading-tight" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel, color: palette.title }}>
        Todos os itens deste nível são obrigatórios.
      </div>
    );
  }

  return null;
}

function RenderC4Overrides({
  level,
  rationale,
  selectedReasonIds,
  onUpdateReasons,
  palette,
}: {
  level: EnemLevel;
  rationale: RubricGroup | undefined;
  selectedReasonIds: Set<string>;
  onUpdateReasons: (ids: string[]) => void;
  palette: { strong: string; title: string; pastel: string };
}) {
  if (!rationale) return null;

  const mkMulti = (needles: string[], extras?: { checkbox?: { id: string | null; label: string } }) => {
    const opts = optionsByContains(rationale, needles);
    const sel = new Set(selectedReasonIds);
    const value = opts.filter((o) => sel.has(o.id)).map((o) => o.id);
    const onSel = (ids: string[], extraChecked?: boolean) => {
      const base = ids;
      const withExtra = extras?.checkbox?.id && extraChecked ? [...base, extras.checkbox.id] : base;
      onUpdateReasons(ensureUnique(withExtra));
    };
    const extraId = extras?.checkbox?.id ?? null;
    const extraChecked = extraId ? sel.has(extraId) : false;

    return (
      <div className="space-y-2 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
        <p
          className="font-semibold"
          style={{ fontSize: 'var(--pdf-fz-xs)', color: palette.title }}
        >
          Selecione um ou mais itens (E/OU)
        </p>
        <select
          multiple
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={value}
          onChange={(e) => {
            const ids = Array.from(e.target.selectedOptions).map((o) => o.value);
            onSel(ids, extraChecked);
          }}
          size={Math.min(6, Math.max(3, opts.length))}
        >
          {opts.map((o) => (
            <option key={o.id} value={o.id}>{fixLabel(o.label)}</option>
          ))}
        </select>
        {extras?.checkbox && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={extraChecked}
              onChange={(e) => onSel(value, e.target.checked)}
            />
            {extras.checkbox.label}
          </label>
        )}
      </div>
    );
  };

  // Map por nível conforme especificação
  if (level.level === 1) {
    return mkMulti([
      'elementos coesivos intra e interparágrafos',
      'EXCESSIVAS repetições',
      'EXCESSIVAS inadequações',
    ]);
  }
  if (level.level === 2) {
    return mkMulti([
      'elementos coesivos intra e interparágrafos',
      'MUITAS repetições',
      'MUITAS inadequações',
    ], {
      checkbox: { id: findCriterionIdByContains(rationale, 'Texto monobloco'), label: 'Texto monobloco' },
    });
  }
  if (level.level === 3) {
    return mkMulti([
      'elementos coesivos intra e interparágrafos',
      'ALGUMAS repetições',
      'ALGUMAS inadequações',
    ]);
  }
  if (level.level === 4) {
    return mkMulti([
      'elementos coesivos intra e interparágrafos',
      'POUCAS repetições',
      'POUCAS inadequações',
    ]);
  }
  if (level.level === 5) {
    return mkMulti([
      'elementos coesivos intra e interparágrafos',
      'RARAS ou AUSENTES repetições',
      'SEM inadequações',
    ]);
  }
  return null;
}

function RenderC5Overrides({
  level,
  rationale,
  selectedReasonIds,
  onUpdateReasons,
  palette,
}: {
  level: EnemLevel;
  rationale: RubricGroup | undefined;
  selectedReasonIds: Set<string>;
  onUpdateReasons: (ids: string[]) => void;
  palette: { strong: string; title: string; pastel: string };
}) {
  if (!rationale) return null;
  const id = (s: string) => findCriterionIdByContains(rationale, s);

  // C5 nível 0: select before justification, hide after choose, show Edit pill
  if (level.level === 0) {
    const opts = [
      { id: id('Ausência de proposta'), label: 'Ausência de proposta' },
      { id: id('desrespeita os direitos humanos'), label: 'Proposta que desrespeita os direitos humanos' },
      { id: id('não relacionada ao assunto'), label: 'Proposta não relacionada ao assunto' },
    ].filter(o => o.id) as { id: string; label: string }[];
    const current = Array.from(selectedReasonIds)[0] || '';
    const [isEditing, setIsEditing] = useState(!current);
    const selectedOption = opts.find(o => o.id === current);
    if (!isEditing && current) {
      return (
        <div className="space-y-2 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
          <div className="flex items-center gap-2">
            <span
              className="text-xs rounded-full px-2 py-1 border font-medium"
              style={{
                backgroundColor: palette.pastel,
                borderColor: palette.title,
                color: palette.strong,
                borderWidth: 1,
                borderStyle: 'solid',
                fontSize: '13px'
              }}
            >
              {selectedOption ? renderHighlighted(selectedOption.label, palette) : null}
            </span>
            <button
              type="button"
              className="text-xs ml-2 px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-orange-50 text-orange-700"
              onClick={() => setIsEditing(true)}
              style={{ fontSize: '12px' }}
            >
              editar
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
        <p
          className="font-semibold leading-tight"
          style={{ fontSize: 'var(--pdf-fz-xs)', color: palette.title }}
        >
          Selecione <strong>um</strong> item (OU)
        </p>
        <select
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={current}
          onChange={(e) => {
            onUpdateReasons(e.target.value ? [e.target.value] : []);
            setIsEditing(false);
          }}
        >
          <option value="">— escolher —</option>
          {opts.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  // C5 nível 1: select before justification, hide after choose, show Edit pill
  if (level.level === 1) {
    const opts = [
      { id: id('Tangenciamento ao tema') || id('Tangênciamento ao tema'), label: 'Tangenciamento ao tema' },
      { id: id('Apenas elementos nulos'), label: 'Apenas elementos nulos' },
      { id: id('1 elemento válido'), label: '1 elemento válido' },
    ].filter(o => o.id) as { id: string; label: string }[];
    const current = Array.from(selectedReasonIds)[0] || '';
    const [isEditing, setIsEditing] = useState(!current);
    const selectedOption = opts.find(o => o.id === current);
    if (!isEditing && current) {
      return (
        <div className="space-y-2 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
          <div className="flex items-center gap-2">
            <span
              className="text-xs rounded-full px-2 py-1 border font-medium"
              style={{
                backgroundColor: palette.pastel,
                borderColor: palette.title,
                color: palette.strong,
                borderWidth: 1,
                borderStyle: 'solid',
                fontSize: '13px'
              }}
            >
              {selectedOption ? renderHighlighted(selectedOption.label, palette) : null}
            </span>
            <button
              type="button"
              className="text-xs ml-2 px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-orange-50 text-orange-700"
              onClick={() => setIsEditing(true)}
              style={{ fontSize: '12px' }}
            >
              editar
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
        <p
          className="font-semibold leading-tight"
          style={{ fontSize: 'var(--pdf-fz-xs)', color: palette.title }}
        >
          Selecione <strong>um</strong> item (OU)
        </p>
        <select
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={current}
          onChange={(e) => {
            onUpdateReasons(e.target.value ? [e.target.value] : []);
            setIsEditing(false);
          }}
        >
          <option value="">— escolher —</option>
          {opts.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  // C5 nível 2: select before justification, hide after choose, show Edit pill
  if (level.level === 2) {
    const optA = id('2 elementos válidos');
    const optB = id('Estrutura CONDICIONAL com dois ou mais elementos válidos') || id('Estrutura CONDICIONAL');
    const opts = [
      optA ? { id: optA, label: '2 elementos válidos' } : null,
      optB ? { id: optB, label: 'Estrutura CONDICIONAL com dois ou mais elementos válidos' } : null,
    ].filter(Boolean) as { id: string; label: string }[];
    const current = Array.from(selectedReasonIds)[0] || '';
    const [isEditing, setIsEditing] = useState(!current);
    const selectedOption = opts.find(o => o.id === current);
    if (!isEditing && current) {
      return (
        <div className="space-y-2 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
          <div className="flex items-center gap-2">
            <span
              className="text-xs rounded-full px-2 py-1 border font-medium"
              style={{
                backgroundColor: palette.pastel,
                borderColor: palette.title,
                color: palette.strong,
                borderWidth: 1,
                borderStyle: 'solid',
                fontSize: '13px'
              }}
            >
              {selectedOption ? renderHighlighted(selectedOption.label, palette) : null}
            </span>
            <button
              type="button"
              className="text-xs ml-2 px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-orange-50 text-orange-700"
              onClick={() => setIsEditing(true)}
              style={{ fontSize: '12px' }}
            >
              editar
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2 rounded-xl border p-2.5" style={{ backgroundColor: palette.pastel, borderColor: palette.pastel }}>
        <p
          className="font-semibold leading-tight"
          style={{ fontSize: 'var(--pdf-fz-xs)', color: palette.title }}
        >
          Selecione <strong>um</strong> item (OU)
        </p>
        <select
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={current}
          onChange={(e) => {
            onUpdateReasons(e.target.value ? [e.target.value] : []);
            setIsEditing(false);
          }}
        >
          <option value="">— escolher —</option>
          {opts.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  // Para níveis 3, 4, 5 deixamos o RenderGroup padrão (sem override)
  return null;
}

export function EnemScoringForm({ selections, onChange, onFocusCategory }: Props) {
  useEffect(() => {
    if ((import.meta as any)?.env?.DEV) {
      try {
        selfTestRoundTrip();
      } catch (err) {
        console.warn('[ENEM composer RT] erro na verificação', err);
      }
    }
  }, []);

  return (
    <div className="space-y-5">
      {ENEM_2024.map((competency) => {
        const palette = ENEM_COLORS_HEX[competency.key];
        const roman = toRoman(parseInt(String(competency.key).replace('C', ''), 10) || 0);
        const selection = selections[competency.key] || { level: competency.levels[0]?.level ?? 0, reasonIds: [] };
        const categoryForScroll = mapCompetencyToCategory(competency.key);
        const strongClass = `enem-${competency.key.toLowerCase()}-strong`;
        const cardToneClass = COMPETENCY_CARD_TONE[competency.key] ?? 'border border-slate-200 bg-white';
        const levelData =
          competency.levels.find((level) => level.level === selection.level) ?? competency.levels[0];
        const availableReasonIds = levelData?.rationale ? collectReasonIds(levelData.rationale) : [];
        const filteredReasonIds = selection.reasonIds.filter((id) => availableReasonIds.includes(id));
        const selectedReasonIds = new Set(filteredReasonIds);
        debugCheck(filteredReasonIds, `Comp ${competency.key} / Nível ${levelData.level} (loaded)`);

        // Memoized ordered labels for summary panel
        const composer = COMPOSER_ON ? getComposerForLevel(competency.key, levelData.level) : null;
        const orderedLabels = useMemo(
          () => (levelData?.rationale ? orderedSelectedLabels(levelData.rationale, Array.from(selectedReasonIds)) : []),
          [levelData?.rationale, selectedReasonIds]
        );
        const staticJust = levelData?.staticJustification ? fixLabel(levelData.staticJustification) : '';
        const justificationText = selection.justification?.trim() || '';
        const labelsToShowBase =
          orderedLabels.length > 0
            ? orderedLabels
            : staticJust
            ? [staticJust]
            : [];
        const fallbackJustification =
          buildJustificationFromReasonIds(competency.key as any, levelData.level, filteredReasonIds) ?? '';

        const handleLevelChange = (level: EnemLevel) => {
          const nextComposer = getComposerForLevel(competency.key, level.level);

          if (nextComposer) {
            onChange(competency.key, { level: level.level, reasonIds: [], justification: undefined });
          } else if (competency.key === 'C2' && (level.level === 4 || level.level === 5) && level.rationale) {
            const needles = level.level === 4
              ? ['Abordagem completa do tema', '3 partes do texto (nenhuma embrionária)', 'repertório legitimado', 'pertinente ao tema', 'SEM uso produtivo']
              : ['Abordagem completa do tema', '3 partes do texto (nenhuma embrionária)', 'repertório legitimado', 'pertinente ao tema', 'COM uso produtivo'];
            const ids = ensureUnique(needles.map((n) => findCriterionIdByContains(level.rationale!, n)));
            debugCheck(ids, `Comp ${competency.key} / Nível ${level.level} (auto static)`);
            onChange(competency.key, { level: level.level, reasonIds: ids, justification: undefined });
          } else if (competency.key === 'C3' && (level.level === 3 || level.level === 4 || level.level === 5) && level.rationale) {
            const needles = level.level === 3
              ? ['ALGUMAS falhas', 'Desenvolvimento de informações, fatos e opiniões com ALGUMAS lacunas']
              : level.level === 4
              ? ['POUCAS falhas', 'Desenvolvimento de informações, fatos e opiniões com POUCAS lacunas']
              : ['Projeto de texto estratégico', 'Desenvolvimento de informações, fatos e opiniões em TODO o texto'];
            const ids = ensureUnique(needles.map((n) => findCriterionIdByContains(level.rationale!, n)));
            debugCheck(ids, `Comp ${competency.key} / Nível ${level.level} (auto static)`);
            onChange(competency.key, { level: level.level, reasonIds: ids, justification: undefined });
          } else {
            onChange(competency.key, { level: level.level, reasonIds: [], justification: undefined });
          }
          if (onFocusCategory) onFocusCategory(categoryForScroll);
        };

        const handleReasonsChange = (reasonIds: string[]) => {
          debugCheck(reasonIds, `Comp ${competency.key} / Nível ${levelData.level} (manual)`);
          onChange(competency.key, { level: levelData.level, reasonIds, justification: undefined });
          if (onFocusCategory) onFocusCategory(categoryForScroll);
        };

        if (!composer) {
          return (
            <LegacyEnemLevelForm
              key={competency.key}
              competency={competency}
              palette={palette}
              roman={roman}
              levelData={levelData}
              selectedReasonIds={selectedReasonIds}
              handleLevelChange={handleLevelChange}
              handleReasonsChange={handleReasonsChange}
              composerUI={null}
              labelsToShow={labelsToShowBase}
              fallbackJustification={fallbackJustification}
              justificationText={justificationText}
              strongClass={strongClass}
              cardToneClass={cardToneClass}
            />
          );
        }

        const renderComposer = (connectorClassName?: string) => {
          if (!composer) return null;
          const confirm = (sel: ComposerSelection) => {
            const payload = buildSavePayload(composer, sel);
            const reasonIds = Array.from(new Set(payload.reasonIds)).sort();
            debugCheck(reasonIds, `Comp ${competency.key} / Nível ${levelData.level} (composer)`);
            onChange(competency.key, {
              level: levelData.level,
              reasonIds,
              justification: payload.justification,
            });
            if (onFocusCategory) onFocusCategory(categoryForScroll);
          };

          return (
            <ComposerViewGeneric
              composer={composer}
              initialReasonIds={filteredReasonIds}
              onConfirm={confirm}
              connectorClassName={connectorClassName}
            />
          );
        };

        const composerUI = renderComposer(strongClass);

        return (
          <LegacyEnemLevelForm
            key={competency.key}
            competency={competency}
            palette={palette}
            roman={roman}
            levelData={levelData}
            selectedReasonIds={selectedReasonIds}
            handleLevelChange={handleLevelChange}
            handleReasonsChange={handleReasonsChange}
            composerUI={composerUI}
            labelsToShow={labelsToShowBase}
            fallbackJustification={fallbackJustification}
            justificationText={justificationText}
            strongClass={strongClass}
            cardToneClass={cardToneClass}
          />
        );
      })}
    </div>
  );
}

export default EnemScoringForm;
