import { Fragment, useMemo } from 'react';
import {
  ENEM_2024,
  type EnemCompetency,
  type EnemLevel,
  type RubricCriterion,
  type RubricGroup,
} from '@/features/essay/rubrics/enem2024';
import { highlightUppercaseTokens } from '@/utils/text';

type CompetencyKey = EnemCompetency['key'];

export type EnemSelection = {
  level: number;
  reasonIds: string[];
};

export type EnemSelectionsMap = Record<CompetencyKey, EnemSelection>;

type Props = {
  selections: EnemSelectionsMap;
  onChange: (key: CompetencyKey, selection: EnemSelection) => void;
};

type GroupRenderProps = {
  competencyKey: CompetencyKey;
  level: EnemLevel;
  group: RubricGroup;
  selectedReasonIds: Set<string>;
  onUpdateReasons: (newReasonIds: string[]) => void;
};

const HIGHLIGHT_CLASS = 'bg-amber-100 text-amber-700 font-semibold px-1 rounded';

function renderSummary(summary: string) {
  const parts = highlightUppercaseTokens(summary);
  return parts.map((part, index) => (
    <span
      key={`${part.text}-${index}`}
      className={part.highlight ? HIGHLIGHT_CLASS : undefined}
    >
      {part.text}
    </span>
  ));
}

function collectReasonIds(node: RubricGroup | RubricCriterion): string[] {
  if ('id' in node) {
    return [node.id];
  }
  return node.items.flatMap((item) => collectReasonIds(item));
}

function uniqueReasonIds(ids: string[]) {
  return Array.from(new Set(ids));
}

function RenderGroup({
  competencyKey,
  level,
  group,
  selectedReasonIds,
  onUpdateReasons,
}: GroupRenderProps) {
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
    const labelParts = highlightUppercaseTokens(criterion.label);
    const checked = selectedReasonIds.has(criterion.id);
    if (group.op === 'OR' && !multiple) {
      return (
        <label
          key={criterion.id}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-orange-300"
          aria-describedby={`competencia-${competencyKey}`}
        >
          <input
            type="radio"
            name={`${competencyKey}-${level.level}-${groupReasonIds.join('-')}`}
            checked={checked}
            onChange={() => handleSelectRadio(criterion)}
            className="h-4 w-4 text-orange-500 focus:ring-orange-400"
          />
          <span>
            {labelParts.map((part, partIndex) => (
              <span key={partIndex} className={part.highlight ? HIGHLIGHT_CLASS : undefined}>
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
        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-orange-300"
        aria-describedby={`competencia-${competencyKey}`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => handleToggleCheckbox(criterion, event.target.checked)}
          className="h-4 w-4 rounded text-orange-500 focus:ring-orange-400"
        />
        <span>
          {labelParts.map((part, partIndex) => (
            <span key={partIndex} className={part.highlight ? HIGHLIGHT_CLASS : undefined}>
              {part.text}
            </span>
          ))}
        </span>
      </label>
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">
        {group.op === 'AND'
          ? 'Selecione os itens que justificam o nível (E)'
          : group.multiple
            ? 'Selecione os itens que justificam o nível (E/OU)'
            : 'Selecione um item que justifica o nível (OU)'}
      </p>
      <div className="space-y-3">
        {group.items.map((item, index) => {
          if ('id' in item) {
            return renderCriterion(item, group.multiple || group.op === 'AND', index);
          }
          return (
            <div key={`group-${index}`} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
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

export function EnemScoringForm({ selections, onChange }: Props) {
  return (
    <div className="space-y-6">
      {ENEM_2024.map((competency) => {
        const selection = selections[competency.key] || { level: competency.levels[0]?.level ?? 0, reasonIds: [] };
        const levelData =
          competency.levels.find((level) => level.level === selection.level) ?? competency.levels[0];
        const availableReasonIds = levelData?.rationale ? collectReasonIds(levelData.rationale) : [];
        const filteredReasonIds = selection.reasonIds.filter((id) => availableReasonIds.includes(id));
        const selectedReasonIds = new Set(filteredReasonIds);

        const handleLevelChange = (level: EnemLevel) => {
          onChange(competency.key, { level: level.level, reasonIds: [] });
        };

        const handleReasonsChange = (reasonIds: string[]) => {
          onChange(competency.key, { level: levelData.level, reasonIds });
        };

        return (
          <section
            key={competency.key}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            id={`competencia-${competency.key}`}
          >
            <header className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-base font-semibold text-slate-900">
                  {competency.title} — {competency.description}
                </h4>
                <span className="text-sm font-medium text-orange-600">
                  Nível selecionado: {levelData.level} ({levelData.points} pts)
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
                      className={`rounded-lg border px-3 py-1 text-sm transition ${
                        isSelected
                          ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-orange-200'
                      }`}
                    >
                      Nível {level.level} • {level.points}
                    </button>
                  );
                })}
              </div>
            </header>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {renderSummary(levelData.summary).map((part, index) => (
                <Fragment key={index}>{part}</Fragment>
              ))}
            </div>

            {levelData.rationale && (
              <RenderGroup
                competencyKey={competency.key}
                level={levelData}
                group={levelData.rationale}
                selectedReasonIds={selectedReasonIds}
                onUpdateReasons={handleReasonsChange}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

export default EnemScoringForm;
