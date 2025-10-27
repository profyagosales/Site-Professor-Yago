import { Fragment, useMemo, useState } from 'react';
import {
  ENEM_2024,
  type EnemCompetency,
  type EnemLevel,
  type RubricCriterion,
  type RubricGroup,
} from '@/features/essay/rubrics/enem2024';
import { highlightUppercaseTokens } from '@/utils/text';

const HIGHLIGHT_RE = /\b(E\/OU|E|OU|COM|MAS|NÃO|NENHUMA|ALGUMAS?)\b/gi;
function highlightTokens(text: string) {
  return text.split(HIGHLIGHT_RE).map((part, i) => {
    if (!part) return null;
    const key = part.toUpperCase();
    const isNeg = key === 'NÃO' || key === 'NENHUMA';
    return HIGHLIGHT_RE.test(part)
      ? (
          <mark key={i} className={`enem-token${isNeg ? ' ' : ''}`} data-k={isNeg ? 'neg' : undefined}>
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

const CONNECTOR_SET = new Set(['E', 'OU', 'E/OU']);
function isConnectorToken(txt: string) {
  const t = (txt ?? '').trim();
  const norm = t.replace(/[.,;:!?)]$/, '').replace(/^[(]/, '');
  // match ONLY uppercase exact tokens
  return CONNECTOR_SET.has(norm);
}

// Helper to render a label string with highlights (for justification summary)
function renderHighlighted(label: string, palette: { strong: string; title: string; pastel: string }) {
  // Use renderSummary to highlight tokens in the label string
  return renderSummary(label, palette);
}
function renderSummary(summary: string, palette: { strong: string; title: string; pastel: string }) {
  // keep uppercase highlights, but also force E/OU tokens
  const parts = highlightUppercaseTokens(summary);
  return parts.flatMap((part, index) => {
    if (part.highlight) {
      return (
        <span
          key={`sum-${index}`}
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
  const [ouState, setOuState] = useState<Record<string, { value?: string; open: boolean }>>({});

  function renderOUSelector(compId: string, options: { value: string; label: string }[]) {
    const s = ouState[compId] ?? { open: true };
    if (!options?.length) return null;

    if (!s.open && s.value) {
      return (
        <div className="flex items-center justify-between gap-2">
          <small className="text-slate-500">Opção (OU) selecionada</small>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setOuState((p) => ({ ...p, [compId]: { ...p[compId], open: true } }))}
          >
            editar
          </button>
        </div>
      );
    }

    return (
      <div className="mb-2">
        <label className="block text-xs font-semibold text-slate-500 mb-1">Selecione um item (OU)</label>
        <select
          className="input w-full"
          value={s.value ?? ''}
          onChange={(e) => setOuState((p) => ({ ...p, [compId]: { value: e.target.value, open: false } }))}
        >
          <option value="" disabled>
            — escolher —
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {ENEM_2024.map((competency) => {
        const palette = ENEM_COLORS_HEX[competency.key];
        const roman = toRoman(parseInt(String(competency.key).replace('C', ''), 10) || 0);
        const selection = selections[competency.key] || { level: competency.levels[0]?.level ?? 0, reasonIds: [] };
        const categoryForScroll = mapCompetencyToCategory(competency.key);
        const levelData =
          competency.levels.find((level) => level.level === selection.level) ?? competency.levels[0];
        const availableReasonIds = levelData?.rationale ? collectReasonIds(levelData.rationale) : [];
        const filteredReasonIds = selection.reasonIds.filter((id) => availableReasonIds.includes(id));
        const selectedReasonIds = new Set(filteredReasonIds);

        // Memoized ordered labels for summary panel
        const orderedLabels = useMemo(
          () => (levelData?.rationale ? orderedSelectedLabels(levelData.rationale, Array.from(selectedReasonIds)) : []),
          [levelData?.rationale, selectedReasonIds]
        );
        // Static fallback for levels without selection controls
        const staticJust = levelData?.staticJustification ? fixLabel(levelData.staticJustification) : '';
        const labelsToShow = orderedLabels.length > 0 ? orderedLabels : (staticJust ? [staticJust] : []);

        const handleLevelChange = (level: EnemLevel) => {
          if (competency.key === 'C2' && (level.level === 4 || level.level === 5) && level.rationale) {
            const needles = level.level === 4
              ? ['Abordagem completa do tema', '3 partes do texto (nenhuma embrionária)', 'repertório legitimado', 'pertinente ao tema', 'SEM uso produtivo']
              : ['Abordagem completa do tema', '3 partes do texto (nenhuma embrionária)', 'repertório legitimado', 'pertinente ao tema', 'COM uso produtivo'];
            const ids = ensureUnique(needles.map((n) => findCriterionIdByContains(level.rationale!, n)));
            onChange(competency.key, { level: level.level, reasonIds: ids });
          } else if (competency.key === 'C3' && (level.level === 3 || level.level === 4 || level.level === 5) && level.rationale) {
            const needles = level.level === 3
              ? ['ALGUMAS falhas', 'Desenvolvimento de informações, fatos e opiniões com ALGUMAS lacunas']
              : level.level === 4
              ? ['POUCAS falhas', 'Desenvolvimento de informações, fatos e opiniões com POUCAS lacunas']
              : ['Projeto de texto estratégico', 'Desenvolvimento de informações, fatos e opiniões em TODO o texto'];
            const ids = ensureUnique(needles.map((n) => findCriterionIdByContains(level.rationale!, n)));
            onChange(competency.key, { level: level.level, reasonIds: ids });
          } else {
            onChange(competency.key, { level: level.level, reasonIds: [] });
          }
          if (onFocusCategory) onFocusCategory(categoryForScroll);
        };

        const handleReasonsChange = (reasonIds: string[]) => {
          onChange(competency.key, { level: levelData.level, reasonIds });
          if (onFocusCategory) onFocusCategory(categoryForScroll);
        };

        return (
          <section
            key={competency.key}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            id={`competencia-${competency.key}`}
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
                  {renderSummary(levelData.summary, palette).map((part, index) => (
                    <Fragment key={index}>{part}</Fragment>
                  ))}
                </div>
              </div>
            )}

            {levelData.rationale && (
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
            )}

            {/* OU selector on top, then justification block */}
            {(() => {
              // Build OU options by scanning rationale labels containing 'OU'
              const ouOptions: { value: string; label: string }[] = [];
              if (levelData.rationale) {
                const collect = (node: RubricGroup | RubricCriterion) => {
                  if ('id' in node) {
                    const lbl = fixLabel(node.label);
                    if (/\bOU\b/i.test(lbl)) {
                      ouOptions.push({ value: node.id, label: lbl });
                    }
                    return;
                  }
                  node.items.forEach(collect);
                };
                collect(levelData.rationale);
              }

              // Selected labels for justification
              let labelsToShow = orderedSelectedLabels(levelData.rationale as RubricGroup, Array.from(selectedReasonIds));
              // If OU exists, show only chosen option
              const s = ouState[competency.key] ?? { open: true };
              if (ouOptions.length) {
                if (s.value) {
                  const lbl = findCriterionLabelById(levelData.rationale as RubricGroup, s.value);
                  labelsToShow = lbl ? [lbl] : [];
                } else {
                  labelsToShow = [];
                }
              }

              return (
                <>
                  {renderOUSelector(competency.key, ouOptions)}
                  <div className="enem-justif mt-1">
                    <strong className="block text-slate-600 mb-1 pdf-sm">Justificativa selecionada:</strong>
                    {labelsToShow.length === 0 ? (
                      <span className="opacity-70">— nenhuma seleção ainda —</span>
                    ) : (
                      <span className="pdf-md">
                        {labelsToShow.map((lbl, idx) => (
                          <Fragment key={`j-${idx}`}>{highlightTokens(lbl)}</Fragment>
                        ))}
                      </span>
                    )}
                  </div>
                </>
              );
            })()}
          </section>
        );
      })}
    </div>
  );
}

export default EnemScoringForm;
